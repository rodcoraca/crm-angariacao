import { extractListings, extractNextData } from "./parsers.js";

const DEFAULT_MAX_PAGES = 20;

function toPositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : null;
}

function resolveLastPage(nextData) {
  const pagination = nextData?.props?.pageProps?.data?.searchAds?.pagination;
  if (!pagination || typeof pagination !== "object") return null;

  return (
    toPositiveInteger(pagination.totalPages) ||
    toPositiveInteger(pagination.total_pages) ||
    toPositiveInteger(pagination.pageCount) ||
    toPositiveInteger(pagination.pages) ||
    toPositiveInteger(pagination.lastPage)
  );
}

// RC1.0.1
// Paginacao implementada para evitar perda de oportunidades.
// Limite inicial Beta: 20 paginas.
// Futuramente tornar configuravel por empresa.
function toTimestamp(value) {
  if (value == null || value === "") return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function getOldestListingTimestamp(listings) {
  let oldest = null;

  for (const listing of listings) {
    const timestamp = toTimestamp(listing?.createdAtFirst || listing?.createdAt || listing?.publishedAt);
    if (timestamp === null) continue;
    if (oldest === null || timestamp < oldest) {
      oldest = timestamp;
    }
  }

  return oldest;
}

function filterPageListingsByCheckpoint(listings, checkpointMs) {
  if (!Number.isFinite(checkpointMs)) {
    return { filtered: listings, stopAtPage: false, stopReason: null };
  }

  const filtered = [];
  let hasAfterCheckpoint = false;
  let hasAtOrBeforeCheckpoint = false;

  for (const listing of listings) {
    const listingTimestamp = toTimestamp(listing?.createdAtFirst || listing?.createdAt || listing?.publishedAt);

    if (listingTimestamp === null) {
      filtered.push(listing);
      hasAfterCheckpoint = true;
      continue;
    }

    if (listingTimestamp > checkpointMs) {
      filtered.push(listing);
      hasAfterCheckpoint = true;
    } else {
      hasAtOrBeforeCheckpoint = true;
    }
  }

  if (hasAfterCheckpoint && hasAtOrBeforeCheckpoint) {
    return { filtered, stopAtPage: true, stopReason: "checkpoint_reached" };
  }

  if (!hasAfterCheckpoint && hasAtOrBeforeCheckpoint) {
    return { filtered: [], stopAtPage: true, stopReason: "checkpoint_reached" };
  }

  return { filtered, stopAtPage: false, stopReason: null };
}

export async function collectImovirtualPaginatedListings({
  maxPages = DEFAULT_MAX_PAGES,
  fetchPage,
  onPage,
  checkpoint = null
} = {}) {
  if (typeof fetchPage !== "function") {
    throw new Error("fetchPage é obrigatório para paginação do Imovirtual.");
  }

  const checkpointMs = checkpoint === null || checkpoint === undefined ? null : Number(checkpoint);
  const listings = [];
  let fetchedAt = null;
  let pagesProcessed = 0;
  let lastPageKnown = null;
  let stopReason = "max_pages";

  for (let page = 1; page <= maxPages; page += 1) {
    const pageResult = await fetchPage(page);
    const pageFetchedAt = pageResult?.fetchedAt || new Date().toISOString();
    const html = pageResult?.html || "";

    if (!fetchedAt) {
      fetchedAt = pageFetchedAt;
    }

    const nextData = extractNextData(html);
    const rawPageListings = extractListings(nextData);
    const resolvedLastPage = resolveLastPage(nextData);
    if (resolvedLastPage) {
      lastPageKnown = resolvedLastPage;
    }

    pagesProcessed = page;

    if (typeof onPage === "function") {
      onPage({
        page,
        found: rawPageListings.length,
        totalPages: lastPageKnown
      });
    }

    if (rawPageListings.length === 0) {
      stopReason = "empty_page";
      break;
    }

    const checkpointPage = filterPageListingsByCheckpoint(rawPageListings, checkpointMs);
    const effectiveListings = checkpointPage.filtered;

    if (checkpointMs !== null && checkpointPage.stopAtPage) {
      if (effectiveListings.length > 0) {
        listings.push(...effectiveListings);
      }
      stopReason = checkpointPage.stopReason;
      break;
    }

    if (checkpointMs === null) {
      listings.push(...rawPageListings);
    } else {
      listings.push(...effectiveListings);
    }

    if (lastPageKnown && page >= lastPageKnown) {
      stopReason = "last_page";
      break;
    }
  }

  if (!fetchedAt) {
    fetchedAt = new Date().toISOString();
  }

  return {
    listings,
    fetchedAt,
    pagesProcessed,
    maxPages,
    lastPageKnown,
    stopReason
  };
}
