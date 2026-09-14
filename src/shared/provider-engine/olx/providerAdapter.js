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
  { worker, delayBetweenRequestsMs = 0, maxRetries = 0, budget = null, requireCompletedDetail = false } = {}
) {
  const enriched = [];
  const metrics = { detailRequests: 0, detailFailures: 0, detailBytes: 0 };
  let budgetStop = null;

  for (const listing of Array.isArray(listings) ? listings : []) {
    const beforeDelay = checkOlxBudget(budget, "detail");
    if (!beforeDelay.allowed) {
      budgetStop = beforeDelay;
      break;
    }

    if (metrics.detailRequests > 0 && delayBetweenRequestsMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenRequestsMs));
    }

    const beforeRequest = checkOlxBudget(budget, "detail");
    if (!beforeRequest.allowed) {
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
        if (!requireCompletedDetail) enriched.push(listing);
        continue;
      }
      enriched.push(mergeOlxListing(listing, parseOlxDetailPage(acquisition.body)));
    } catch (_) {
      metrics.detailFailures += 1;
      if (!requireCompletedDetail) enriched.push(listing);
    }
  }

  return { listings: enriched, metrics, budget: budgetStop };
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
