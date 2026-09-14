import { checkOlxBudget, recordOlxRequest } from "./executionBudget.js";

const OLX_HOSTNAMES = new Set(["olx.pt", "www.olx.pt"]);
const IMOVIES_PATH = "/imoveis/";

function wait(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function average(values) {
  const numeric = values.filter((value) => Number.isFinite(value));
  return numeric.length ? Number((numeric.reduce((total, value) => total + value, 0) / numeric.length).toFixed(2)) : 0;
}

function normalizeOlxPageUrl(value) {
  if (!value) return null;
  let url;
  try {
    url = new URL(value);
  } catch (_) {
    return null;
  }
  if (url.protocol !== "https:" || !OLX_HOSTNAMES.has(url.hostname.toLowerCase()) || !url.pathname.startsWith(IMOVIES_PATH)) return null;
  if (url.pathname.startsWith("/d/") || url.pathname.includes("/d/anuncio/")) return null;
  url.hash = "";
  return url.toString();
}

function createMetrics() {
  return {
    pagesFetched: 0,
    requests: 0,
    successfulPages: 0,
    failedPages: 0,
    totalListings: 0,
    uniqueExternalIds: 0,
    duplicatesRemoved: 0,
    totalBytes: 0,
    durationMs: 0,
    averageListingsPerPage: 0,
    paginationStoppedReason: null
  };
}

export async function acquireOlxSearchPages(searchDefinition, {
  worker,
  parseSearchPage,
  maxPages = 3,
  maxRequests = 3,
  maxRetries = 0,
  maxRedirects = 5,
  delayBetweenRequestsMs = 1500,
  budget = null
} = {}) {
  if (!searchDefinition || typeof searchDefinition !== "object") throw new TypeError("A Search Definition OLX é obrigatória.");
  if (!worker || typeof worker.acquire !== "function") throw new TypeError("O paginator requer um worker de aquisição válido.");
  if (typeof parseSearchPage !== "function") throw new TypeError("O paginator requer um parser OLX válido.");

  const metrics = createMetrics();
  const pages = [];
  const listings = [];
  const externalIds = new Set();
  const visitedUrls = new Set();
  let nextUrl = normalizeOlxPageUrl(searchDefinition.searchUrl);
  let budgetStop = null;

  if (!nextUrl) {
    metrics.paginationStoppedReason = "invalid_next_url";
    return { listings, pages, metrics };
  }

  while (nextUrl && pages.length < maxPages && metrics.requests < maxRequests) {
    if (visitedUrls.has(nextUrl)) {
      metrics.paginationStoppedReason = "visited_url";
      break;
    }

    visitedUrls.add(nextUrl);
    const beforeDelay = checkOlxBudget(budget, "search");
    if (!beforeDelay.allowed) {
      budgetStop = beforeDelay;
      metrics.paginationStoppedReason = "budget_exhausted";
      break;
    }

    if (pages.length > 0) await wait(delayBetweenRequestsMs);

    const beforeRequest = checkOlxBudget(budget, "search");
    if (!beforeRequest.allowed) {
      budgetStop = beforeRequest;
      metrics.paginationStoppedReason = "budget_exhausted";
      break;
    }

    recordOlxRequest(budget, "search");

    let acquisition;
    try {
      const remainingRequests = Math.max(0, maxRequests - metrics.requests - 1);
      acquisition = await worker.acquire(nextUrl, { maxRetries: Math.min(maxRetries, remainingRequests), maxRedirects });
    } catch (error) {
      pages.push({ pageNumber: pages.length + 1, requestedUrl: nextUrl, httpStatus: null, durationMs: 0, bytes: 0, listingsFound: 0, nextUrl: null, error: error.message });
      metrics.requests += 1;
      metrics.paginationStoppedReason = "acquisition_error";
      break;
    }

    metrics.requests += acquisition.attempts || 1;
    const page = {
      pageNumber: pages.length + 1,
      requestedUrl: nextUrl,
      httpStatus: acquisition.status || null,
      durationMs: acquisition.durationMs || 0,
      bytes: acquisition.bytes || 0,
      listingsFound: 0,
      nextUrl: null,
      error: acquisition.errorMessage || null
    };

    if (acquisition.errorType) {
      pages.push(page);
      metrics.paginationStoppedReason = "acquisition_error";
      break;
    }

    let parsed;
    try {
      parsed = parseSearchPage(acquisition.body);
    } catch (error) {
      page.error = error.message;
      pages.push(page);
      metrics.paginationStoppedReason = "acquisition_error";
      break;
    }

    const pageListings = Array.isArray(parsed?.listings) ? parsed.listings : [];
    page.listingsFound = pageListings.length;
    page.nextUrl = parsed?.nextUrl || null;
    pages.push(page);

    for (const listing of pageListings) {
      if (!listing?.externalId || externalIds.has(listing.externalId)) {
        if (listing?.externalId) metrics.duplicatesRemoved += 1;
        continue;
      }
      externalIds.add(listing.externalId);
      listings.push(listing);
    }

    if (!page.nextUrl) {
      metrics.paginationStoppedReason = "no_next_url";
      break;
    }
    if (pages.length >= maxPages) {
      if (budget && page.nextUrl && pages.length >= budget.limits.maxSearchPagesPerCategory) {
        budgetStop = checkOlxBudget(budget, "search");
        metrics.paginationStoppedReason = "budget_exhausted";
        break;
      }
      metrics.paginationStoppedReason = "max_pages";
      break;
    }
    if (metrics.requests >= maxRequests) {
      metrics.paginationStoppedReason = "max_requests";
      break;
    }

    const candidateNextUrl = normalizeOlxPageUrl(page.nextUrl);
    if (!candidateNextUrl) {
      metrics.paginationStoppedReason = "invalid_next_url";
      break;
    }
    if (visitedUrls.has(candidateNextUrl)) {
      metrics.paginationStoppedReason = "visited_url";
      break;
    }
    nextUrl = candidateNextUrl;
  }

  metrics.pagesFetched = pages.length;
  metrics.successfulPages = pages.filter((page) => !page.error).length;
  metrics.failedPages = pages.length - metrics.successfulPages;
  metrics.totalListings = listings.length;
  metrics.uniqueExternalIds = externalIds.size;
  metrics.totalBytes = pages.reduce((total, page) => total + page.bytes, 0);
  metrics.durationMs = pages.reduce((total, page) => total + page.durationMs, 0);
  metrics.averageListingsPerPage = average(pages.map((page) => page.listingsFound));
  metrics.paginationStoppedReason ||= "max_requests";
  return {
    listings,
    pages,
    metrics,
    budget: budgetStop
      ? {
        budgetExhausted: true,
        reason: budgetStop.reason,
        scope: budgetStop.scope
      }
      : null
  };
}