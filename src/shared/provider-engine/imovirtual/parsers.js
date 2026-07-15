const LISTING_SELECTORS = [
  '[data-cy="search.listing"]',
  '[data-testid="listing"]',
  '[data-testid*="listing"]',
  "article"
];

const TITLE_SELECTOR = '[data-cy*="title"], [data-testid*="title"], h2, h3';
const PRICE_SELECTOR = '[data-cy*="price"], [data-testid*="price"], [class*="price"]';
const LOCATION_SELECTOR = '[data-cy*="location"], [data-testid*="location"], [class*="location"]';
const LISTING_LINK_SELECTOR = 'a[href*="/pt/anuncio/"]';

function textFrom(element) {
  return element?.textContent?.replace(/\s+/g, " ").trim() || null;
}

function getExternalId(element, url) {
  const attributeId = element.getAttribute("data-id") || element.getAttribute("data-listing-id");
  if (attributeId) return attributeId;

  const idFromUrl = url.match(/(?:ID|id)([A-Za-z0-9_-]+)(?:\.html)?(?:$|[?#])/);
  return idFromUrl?.[1] || null;
}

export function parseListingIds(html) {
  if (!html || typeof DOMParser === "undefined") {
    console.info("[ProviderEngine][Imovirtual] parse_listing_ids", { totalListings: 0 });
    return [];
  }

  const document = new DOMParser().parseFromString(html, "text/html");
  const cards = [...new Set(LISTING_SELECTORS.flatMap((selector) => [...document.querySelectorAll(selector)]))];
  const listings = cards.reduce((result, card) => {
    const link = card.querySelector(LISTING_LINK_SELECTOR);
    if (!link) return result;

    const url = new URL(link.getAttribute("href"), "https://www.imovirtual.com").toString();
    const externalId = getExternalId(card, url);
    if (!externalId || result.some((listing) => listing.externalId === externalId)) return result;

    result.push({
      externalId,
      title: textFrom(card.querySelector(TITLE_SELECTOR)) || textFrom(link),
      price: textFrom(card.querySelector(PRICE_SELECTOR)),
      location: textFrom(card.querySelector(LOCATION_SELECTOR)),
      url
    });
    return result;
  }, []);

  console.info("[ProviderEngine][Imovirtual] parse_listing_ids", { totalListings: listings.length });
  return listings;
}

export function extractNextData(html) {
  if (!html || typeof html !== "string") return null;

  const nextDataMatch = html.match(
    /<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );

  if (!nextDataMatch) return null;

  try {
    return JSON.parse(nextDataMatch[1]);
  } catch (error) {
    console.info("[ProviderEngine][Imovirtual] extract_next_data_failed", { message: error.message });
    return null;
  }
}

export function buildImovirtualPublicUrl(href) {
  if (!href) return null;

  const normalizedPath = String(href)
    .replace("[lang]", "pt")
    .replace("/ad/", "/anuncio/");
  return new URL(normalizedPath, "https://www.imovirtual.com").toString();
}

export function mapNextDataItemToListing(item) {
  if (!item?.id || !item?.href) {
    return null;
  }

  return {
    externalId: String(item.id),
    title: item.title || null,
    price: item.totalPrice?.value ?? null,
    area: item.areaInSquareMeters ?? null,
    rooms: item.roomsNumber || null,
    city: item.location?.address?.city?.name || null,
    district: item.location?.address?.province?.name || null,
    ownerName: item.advertOwner?.name?.trim() || null,
    url: buildImovirtualPublicUrl(item.href),
    isPrivateOwner: Boolean(item.isPrivateOwner),
    createdAtFirst: item.createdAtFirst || null,
    shortDescription: item.shortDescription || null,
    source: item.source || null
  };
}

export function extractListings(nextData) {
  const items = nextData?.props?.pageProps?.data?.searchAds?.items;
  if (!Array.isArray(items)) return [];

  return items
    .map(mapNextDataItemToListing)
    .filter(Boolean);
}

export const imovirtualListingSelectors = {
  listing: LISTING_SELECTORS,
  title: TITLE_SELECTOR,
  price: PRICE_SELECTOR,
  location: LOCATION_SELECTOR,
  link: LISTING_LINK_SELECTOR
};
