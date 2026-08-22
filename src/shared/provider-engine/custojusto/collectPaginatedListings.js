/**
 * CustoJusto paginated collector
 *
 * Responsabilidade:
 * - Percorrer páginas através de nextUrl.
 * - Usar fetchSearchPage + parser existentes.
 * - Devolver os listings normalizados.
 *
 * NÃO é responsabilidade deste módulo:
 * - persistência;
 * - Supabase;
 * - ProviderSync;
 * - scheduling;
 * - retries;
 * - rate limiting.
 */

import { fetchCustoJustoSearchPage } from "./fetchSearchPage.js";
import { parseCustoJustoSearchPage } from "./parsers.js";

function normalizeDistrictFilterValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export async function collectCustoJustoPaginatedListings(
  startUrl,
  options = {}
) {
  if (!startUrl) {
    throw new Error("CustoJusto start URL is required.");
  }

  const maxPages = Number.isFinite(Number(options.maxPages))
    ? Math.max(1, Number(options.maxPages))
    : 1;

  const selectedDistricts = Array.isArray(options.districts)
    ? options.districts
        .map((district) => normalizeDistrictFilterValue(district))
        .filter(Boolean)
    : [];

  const listings = [];
  const visitedUrls = new Set();

  let currentUrl = startUrl;
  let pagesFetched = 0;

  while (currentUrl && pagesFetched < maxPages) {
    if (visitedUrls.has(currentUrl)) {
      break;
    }

    visitedUrls.add(currentUrl);

    const response = await fetchCustoJustoSearchPage(currentUrl);

    const page = parseCustoJustoSearchPage(response.html);
    const pageListings = selectedDistricts.length > 0
      ? page.listings.filter((listing) => {
          const listingDistrict = normalizeDistrictFilterValue(listing?.district);
          return listingDistrict && selectedDistricts.includes(listingDistrict);
        })
      : page.listings;

    listings.push(...pageListings);

    pagesFetched += 1;

    currentUrl = page.nextUrl;
  }

  return {
    listings,
    pagesFetched,
    nextUrl: currentUrl,
    visitedUrls: [...visitedUrls]
  };
}