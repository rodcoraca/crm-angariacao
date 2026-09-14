import { fetchIdealistaSearchPage } from "./fetchSearchPage.js";
import { parseIdealistaSearchPage } from "./parsers.js";

export async function collectIdealistaPaginatedListings(startUrl, options = {}) {
  if (!startUrl) {
    throw new Error("Idealista start URL is required.");
  }

  const maxPages = Number.isFinite(Number(options.maxPages))
    ? Math.max(1, Number(options.maxPages))
    : 1;

  const includePrivateOwners = options.includePrivateOwners !== false;
  const includeProfessionalOwners = options.includeProfessionalOwners !== false;

  if (!includePrivateOwners && !includeProfessionalOwners) {
    return {
      listings: [],
      pagesFetched: 0,
      nextUrl: null,
      visitedUrls: [],
      fetchedAt: new Date().toISOString()
    };
  }

  const listings = [];
  const visitedUrls = new Set();

  let currentUrl = startUrl;
  let pagesFetched = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    if (!currentUrl || visitedUrls.has(currentUrl)) break;
    visitedUrls.add(currentUrl);

    const response = await fetchIdealistaSearchPage({
      searchUrl: currentUrl,
      page,
      fetchImpl: globalThis.fetch
    });

    const pageResult = parseIdealistaSearchPage(response.html);
    const filteredListings = pageResult.listings.filter((listing) => {
      if (includePrivateOwners && includeProfessionalOwners) {
        return true;
      }

      const ownerFlag = listing?.isPrivateOwner;
      if (ownerFlag === true) return includePrivateOwners;
      if (ownerFlag === false) return includeProfessionalOwners;
      return false;
    });

    listings.push(...filteredListings);
    pagesFetched += 1;

    if (!pageResult.nextUrl || pageResult.nextUrl === currentUrl) {
      break;
    }

    currentUrl = pageResult.nextUrl;
  }

  return {
    listings,
    pagesFetched,
    nextUrl: currentUrl,
    visitedUrls: [...visitedUrls],
    fetchedAt: new Date().toISOString()
  };
}
