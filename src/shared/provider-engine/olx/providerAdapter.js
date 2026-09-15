import { acquireOlxSearchPages } from "./paginatedAcquisition.js";
import { discoverOlxCategories } from "./categoryDiscovery.js";
import { parseOlxSearchPage } from "./parsers.js";
import { parseOlxDetailPage } from "./detailParser.js";
import {
  checkOlxBudget,
  createOlxExecutionBudget,
  getOlxBudgetStatus,
  recordOlxRequest,
  resetOlxCategoryBudget
} from "./executionBudget.js";

const OLX_HOSTNAMES = new Set(["olx.pt", "www.olx.pt"]);
const OLX_LISTINGS_PATH = "/imoveis/";

function normalizeOlxPageUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !OLX_HOSTNAMES.has(url.hostname.toLowerCase()) || !url.pathname.startsWith(OLX_LISTINGS_PATH)) return null;
    if (url.pathname.startsWith("/d/") || url.pathname.includes("/d/anuncio/")) return null;
    url.hash = "";
    return url.toString();
  } catch (_) {
    return null;
  }
}

function parsePrice(value) {
  const text = String(value || "").replace(/[^\d,.-]/g, "").trim();
  if (!text) return null;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text.replace(/\./g, "");
  const price = Number(normalized);
  return Number.isFinite(price) ? price : null;
}

function normalizeDistrict(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function mergeOlxListing(listing, detail) {
  const merged = { ...listing };
  for (const [key, value] of Object.entries(detail || {})) {
    if (value !== null && value !== undefined && value !== "") merged[key] = value;
  }
  return merged;
}

export function filterOlxListingsByDistrict(listings, districts = []) {
  const selectedDistricts = Array.isArray(districts)
    ? districts.map(normalizeDistrict).filter(Boolean)
    : [];

  if (selectedDistricts.length === 0) return Array.isArray(listings) ? listings : [];

  return (Array.isArray(listings) ? listings : []).filter((listing) => {
    const listingDistrict = normalizeDistrict(listing?.district);
    return listingDistrict && selectedDistricts.includes(listingDistrict);
  });
}

export function normalizeOlxListing(listing) {
  if (!listing?.externalId || !listing?.url) return null;

  return {
    externalId: String(listing.externalId).trim(),
    title: listing.title || null,
    price: parsePrice(listing.price),
    url: listing.url,
    location: listing.location || null,
    city: null,
    concelho: listing.concelho || null,
    freguesia: listing.freguesia || null,
    district: listing.district || null,
    area: listing.area ?? null,
    rooms: listing.rooms ?? null,
    ownerName: listing.ownerName || null,
    isPrivateOwner: listing.isPrivateOwner ?? null,
    createdAtFirst: null,
    publishedAt: listing.publishedAt || null,
    ...(listing.publishedAtSource ? { publishedAtSource: listing.publishedAtSource } : {}),
    modifiedAt: null,
    shortDescription: listing.shortDescription || null,
    ...(listing.existingProviderLeadId ? { existingProviderLeadId: listing.existingProviderLeadId } : {}),
    source: "olx",
    rawData: listing
  };
}

export function createOlxCollectionSession(overrides = {}) {
  return { budget: createOlxExecutionBudget(overrides) };
}

export function getOlxCollectionSessionStatus(session) {
  return session?.budget ? getOlxBudgetStatus(session.budget) : null;
}

async function enrichOlxListings(
  listings,
  { worker, delayBetweenRequestsMs = 0, maxRetries = 0, budget = null } = {}
) {
  const enriched = [];
  const metrics = { detailRequests: 0, detailFailures: 0, detailBytes: 0 };
  let budgetStop = null;

  const sourceListings = Array.isArray(listings) ? listings : [];
  for (let listingIndex = 0; listingIndex < sourceListings.length; listingIndex += 1) {
    const listing = sourceListings[listingIndex];
    const beforeDelay = checkOlxBudget(budget, "detail");
    if (!beforeDelay.allowed) {
      enriched.push(...sourceListings.slice(listingIndex));
      budgetStop = beforeDelay;
      break;
    }

    if (metrics.detailRequests > 0 && delayBetweenRequestsMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenRequestsMs));
    }

    const beforeRequest = checkOlxBudget(budget, "detail");
    if (!beforeRequest.allowed) {
      enriched.push(...sourceListings.slice(listingIndex));
      budgetStop = beforeRequest;
      break;
    }

    recordOlxRequest(budget, "detail");
    metrics.detailRequests += 1;

    try {
      const acquisition = await worker.acquire(listing.url, { maxRetries, maxRedirects: 5 });
      metrics.detailBytes += acquisition.bytes || 0;
      if (acquisition.errorType || !acquisition.body) {
        metrics.detailFailures += 1;
        enriched.push(listing);
        continue;
      }
      enriched.push(mergeOlxListing(listing, parseOlxDetailPage(acquisition.body)));
    } catch (_) {
      metrics.detailFailures += 1;
      enriched.push(listing);
    }
  }

  return { listings: enriched, metrics, budget: budgetStop };
}

function createOlxRoundRobinState(searchUrl) {
  return {
    searchUrl,
    nextUrl: searchUrl,
    visitedUrls: new Set(),
    pagesFetched: 0,
    finished: false,
    listings: [],
    metrics: {
      pagesFetched: 0,
      requests: 0,
      successfulPages: 0,
      failedPages: 0,
      totalListings: 0,
      duplicatesRemoved: 0,
      detailRequests: 0,
      detailFailures: 0,
      detailBytes: 0
    },
    error: null,
    budget: null,
    fetchedAt: null
  };
}

function normalizeExistingListingsMap(value) {
  if (value instanceof Map) return value;
  if (!value || typeof value !== "object") return new Map();
  return new Map(Object.entries(value));
}

async function enrichRoundRobinCategory(state, {
  existingListings,
  fetchImpl,
  delayBetweenRequestsMs,
  maxRetries,
  timeoutMs,
  budget
}) {
  const existingMap = normalizeExistingListingsMap(existingListings);
  const newListings = state.listings.filter((listing) => !existingMap.has(String(listing.externalId)));

  resetOlxCategoryBudget(budget);
  const enriched = await enrichOlxListings(newListings, {
    worker: createOlxWorker(fetchImpl, timeoutMs),
    delayBetweenRequestsMs,
    maxRetries,
    budget
  });

  const enrichedById = new Map(enriched.listings.map((listing) => [String(listing.externalId), listing]));
  state.listings = state.listings
    .map((listing) => {
      const externalId = String(listing.externalId);
      if (existingMap.has(externalId)) {
        return { ...listing, existingProviderLeadId: existingMap.get(externalId) };
      }
      return enrichedById.get(externalId) || listing;
    })
    .filter(Boolean);
  state.metrics.detailRequests = enriched.metrics.detailRequests;
  state.metrics.detailFailures = enriched.metrics.detailFailures;
  state.metrics.detailBytes = enriched.metrics.detailBytes;
  state.budget = enriched.budget;
}

export async function collectOlxRoundRobinPaginatedListings({
  searchUrls = [],
  maxPages,
  fetchImpl = globalThis.fetch,
  delayBetweenRequestsMs = 1500,
  districts = [],
  maxRetries = 0,
  timeoutMs = 30000,
  collectionSession = null,
  budget: providedBudget = null,
  resolveExistingListings = null
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Fetch API indisponível para obter páginas OLX.");
  if (!Array.isArray(searchUrls)) throw new TypeError("searchUrls OLX deve ser um array.");

  const budget = collectionSession?.budget || providedBudget;
  const configuredMaxPages = maxPages || budget?.limits.maxSearchPagesPerCategory || 1;
  const effectiveMaxPages = Math.min(
    configuredMaxPages,
    budget?.limits.maxSearchPagesPerCategory || configuredMaxPages
  );
  const states = searchUrls.map((searchUrl) => createOlxRoundRobinState(searchUrl));
  const uniqueExternalIds = new Set();
  const effectiveMaxRequests = budget?.limits.maxSearchRequests ?? states.length * effectiveMaxPages;

  for (let round = 0; round < effectiveMaxPages; round += 1) {
    for (const state of states) {
      if (state.finished || state.pagesFetched >= effectiveMaxPages) continue;
      if (!state.nextUrl || state.visitedUrls.has(state.nextUrl)) {
        state.finished = true;
        continue;
      }
      if (budget && budget.searchRequests >= effectiveMaxRequests) {
        state.finished = true;
        break;
      }

      state.visitedUrls.add(state.nextUrl);
      resetOlxCategoryBudget(budget);
      const result = await acquireOlxSearchPages(
        { provider: "olx", searchUrl: state.nextUrl },
        {
          worker: createOlxWorker(fetchImpl, timeoutMs),
          parseSearchPage: parseOlxSearchPage,
          maxPages: 1,
          maxRequests: 1,
          maxRetries,
          delayBetweenRequestsMs,
          budget
        }
      );

      const page = result.pages[0];
      state.pagesFetched += result.metrics.pagesFetched;
      state.metrics.pagesFetched += result.metrics.pagesFetched;
      state.metrics.requests += result.metrics.requests;
      state.metrics.successfulPages += result.metrics.successfulPages;
      state.metrics.failedPages += result.metrics.failedPages;
      state.metrics.totalListings += result.metrics.totalListings;
      state.metrics.duplicatesRemoved += result.metrics.duplicatesRemoved;
      state.fetchedAt = state.fetchedAt || new Date().toISOString();

      if (result.budget?.scope === "global") {
        state.budget = result.budget;
        state.finished = true;
        break;
      }

      if (budget && budget.searchRequests >= effectiveMaxRequests) {
        const globalBudget = checkOlxBudget(budget, "search");
        state.budget = globalBudget;
        state.finished = true;
      }

      if (!page || page.error || !page.nextUrl) state.finished = true;

      for (const listing of result.listings) {
        const externalId = String(listing?.externalId || "");
        if (!externalId || uniqueExternalIds.has(externalId)) {
          if (externalId) state.metrics.duplicatesRemoved += 1;
          continue;
        }
        uniqueExternalIds.add(externalId);
        state.listings.push(listing);
      }

      if (!state.finished) {
        const nextUrl = normalizeOlxPageUrl(page.nextUrl);
        if (!nextUrl || state.visitedUrls.has(nextUrl)) {
          state.finished = true;
        } else {
          state.nextUrl = nextUrl;
        }
      }
    }

    if (budget?.exhausted || states.every((state) => state.finished)) break;
  }

  const allExternalIds = states.flatMap((state) => state.listings.map((listing) => listing.externalId));
  const existingMap = allExternalIds.length > 0 && typeof resolveExistingListings === "function"
    ? normalizeExistingListingsMap(await resolveExistingListings([...new Set(allExternalIds)]))
    : new Map();

  for (const state of states) {
    await enrichRoundRobinCategory(state, {
      existingListings: existingMap,
      fetchImpl,
      delayBetweenRequestsMs,
      maxRetries,
      timeoutMs,
      budget
    });
    state.listings = filterOlxListingsByDistrict(state.listings, districts)
      .map((listing) => normalizeOlxListing(listing))
      .filter(Boolean);
  }

  return {
    categories: states,
    listings: states.flatMap((state) => state.listings),
    budget: budget?.exhausted
      ? {
        budgetExhausted: true,
        reason: budget.exhaustionReason,
        scope: budget.exhaustionScope
      }
      : null
  };
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOlxPage(url, fetchImpl, timeoutMs = 30000) {
  const response = await fetchWithTimeout(fetchImpl, url, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/142.0.0.0 Safari/537.36"
    },
    redirect: "follow"
  }, timeoutMs);
  const body = await response.text();
  if (!response.ok) throw new Error(`Falha ao obter página OLX (HTTP ${response.status}).`);
  return { body, fetchedAt: new Date().toISOString() };
}

export async function discoverOlxCategoriesForSync({ fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Fetch API indisponível para descobrir categorias OLX.");

  const { body, fetchedAt } = await fetchOlxPage("https://www.olx.pt/imoveis/", fetchImpl);
  return { ...discoverOlxCategories(body), fetchedAt };
}

function createOlxWorker(fetchImpl, timeoutMs = 30000) {
  return {
    async acquire(url) {
      const startedAt = Date.now();
      const response = await fetchWithTimeout(fetchImpl, url, {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/142.0.0.0 Safari/537.36"
        },
        redirect: "follow"
      }, timeoutMs);
      const body = await response.text();
      if (!response.ok) {
        return {
          requestedUrl: url,
          status: response.status,
          body,
          durationMs: Date.now() - startedAt,
          bytes: body.length,
          errorType: response.status >= 500 || response.status === 429 ? "retryable_http" : "http_error",
          errorMessage: `Falha ao obter página OLX (HTTP ${response.status}).`,
          attempts: 1
        };
      }
      return {
        requestedUrl: url,
        finalUrl: response.url,
        status: response.status,
        body,
        durationMs: Date.now() - startedAt,
        bytes: body.length,
        attempts: 1
      };
    }
  };
}

export async function collectOlxPaginatedListings({
  searchUrl,
  maxPages,
  maxRequests,
  fetchImpl = globalThis.fetch,
  delayBetweenRequestsMs = 1500,
  districts = [],
  maxRetries = 0,
  timeoutMs = 30000,
  collectionSession = null,
  budget: providedBudget = null
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Fetch API indisponível para obter páginas OLX.");

  if (!searchUrl) throw new Error("Search Definition OLX sem searchUrl.");
  const budget = collectionSession?.budget || providedBudget;
  if (budget) resetOlxCategoryBudget(budget);
  const effectiveMaxPages = maxPages || budget?.limits.maxSearchPagesPerCategory || 1;
  const effectiveMaxRequests = maxRequests || budget?.limits.maxSearchRequests || effectiveMaxPages;
  const fetchedAt = new Date().toISOString();
  const result = await acquireOlxSearchPages(
    { provider: "olx", searchUrl },
    {
      worker: createOlxWorker(fetchImpl, timeoutMs),
      parseSearchPage: parseOlxSearchPage,
      maxPages: effectiveMaxPages,
      maxRequests: effectiveMaxRequests,
      maxRetries,
      delayBetweenRequestsMs,
      budget
    }
  );

  const enriched = await enrichOlxListings(result.listings, {
    worker: createOlxWorker(fetchImpl, timeoutMs),
    delayBetweenRequestsMs,
    maxRetries,
    budget,
    requireCompletedDetail: Array.isArray(districts) && districts.some(Boolean)
  });

  const budgetStop = enriched.budget || result.budget;

  return {
    ...result,
    maxPages: effectiveMaxPages,
    maxRequests: effectiveMaxRequests,
    metrics: { ...result.metrics, ...enriched.metrics },
    listings: filterOlxListingsByDistrict(enriched.listings, districts)
      .map((listing) => normalizeOlxListing(listing))
      .filter(Boolean),
    fetchedAt,
    budget: budgetStop
      ? {
        budgetExhausted: true,
        reason: budgetStop.reason,
        scope: budgetStop.scope
      }
      : null
  };
}
