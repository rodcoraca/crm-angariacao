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
export async function collectImovirtualPaginatedListings({
  maxPages = DEFAULT_MAX_PAGES,
  fetchPage,
  onPage
} = {}) {
  if (typeof fetchPage !== "function") {
    throw new Error("fetchPage é obrigatório para paginação do Imovirtual.");
  }

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
    const pageListings = extractListings(nextData);
    const resolvedLastPage = resolveLastPage(nextData);
    if (resolvedLastPage) {
      lastPageKnown = resolvedLastPage;
    }

    pagesProcessed = page;

    if (typeof onPage === "function") {
      onPage({
        page,
        found: pageListings.length,
        totalPages: lastPageKnown
      });
    }

    if (pageListings.length === 0) {
      stopReason = "empty_page";
      break;
    }

    listings.push(...pageListings);

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
