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

function normalizeLocationText(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const normalized = normalizeLocationText(entry);
      if (normalized) return normalized;
    }
    return null;
  }

  if (value && typeof value === "object") {
    if (typeof value.name === "string") {
      const trimmed = value.name.trim();
      return trimmed || null;
    }

    if (typeof value.label === "string") {
      const trimmed = value.label.trim();
      return trimmed || null;
    }
  }

  return null;
}

function firstValidLocationValue(...values) {
  for (const value of values) {
    const normalized = normalizeLocationText(value);
    if (normalized) return normalized;
  }

  return null;
}

function getLocationPath(item) {
  const location = item?.location || {};
  const address = location?.address || item?.address || {};
  const reverseLocations = Array.isArray(location?.reverseGeocoding?.locations)
    ? location.reverseGeocoding.locations
    : [];

  const reverseByLevel = (...levels) =>
    reverseLocations.find((entry) =>
      levels.includes(String(entry?.locationLevel || "").trim().toLowerCase())
    );

  const reverseDistrict = reverseByLevel("district", "province", "region");
  const reverseMunicipality = reverseByLevel("council", "municipality", "county");
  const reverseCity = reverseByLevel("city", "locality");
  const reverseParish = reverseByLevel("parish", "freguesia");

  const district = firstValidLocationValue(
    address?.province?.name,
    address?.province,
    location?.province?.name,
    location?.province,
    item?.province,
    item?.district,
    item?.region,
    reverseDistrict?.name,
    reverseDistrict
  );

  const municipality = firstValidLocationValue(
    address?.municipality?.name,
    address?.municipality,
    address?.county?.name,
    address?.county,
    location?.municipality?.name,
    location?.municipality,
    location?.county?.name,
    location?.county,
    item?.municipality,
    item?.concelho,
    item?.county,
    reverseMunicipality?.name,
    reverseMunicipality
  );

  const county = firstValidLocationValue(
    address?.county?.name,
    address?.county,
    location?.county?.name,
    location?.county,
    item?.county,
    item?.concelho,
    item?.municipality,
    municipality
  );

  const city = firstValidLocationValue(
    address?.city?.name,
    address?.city,
    location?.city?.name,
    location?.city,
    item?.city,
    reverseCity?.name,
    reverseCity
  );

  const region = firstValidLocationValue(
    item?.region,
    location?.region,
    location?.region?.name,
    district
  );

  const freguesia = firstValidLocationValue(
    address?.parish?.name,
    address?.parish,
    address?.freguesia?.name,
    address?.freguesia,
    location?.parish?.name,
    location?.parish,
    location?.freguesia?.name,
    location?.freguesia,
    item?.parish,
    item?.freguesia,
    reverseParish?.name,
    reverseParish
  );

  return {
    district,
    municipality: municipality || county || null,
    county: county || municipality || null,
    city,
    region: region || district || null,
    freguesia
  };
}

function normalizeImovirtualPublishedAt(value) {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function deriveImovirtualPublishedAt(item) {
  return normalizeImovirtualPublishedAt(item?.publishedAt ?? item?.dateCreated);
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

  const locationPath = getLocationPath(item);

  return {
    externalId: String(item.id),
    title: item.title || null,
    price: item.totalPrice?.value ?? null,
    area: item.areaInSquareMeters ?? null,
    rooms: item.roomsNumber || null,
    city: locationPath.city,
    district: locationPath.district,
    municipality: locationPath.municipality,
    county: locationPath.county,
    region: locationPath.region,
    freguesia: locationPath.freguesia,
    ownerName: item.advertOwner?.name?.trim() || null,
    url: buildImovirtualPublicUrl(item.href),
    isPrivateOwner: Boolean(item.isPrivateOwner),
    createdAtFirst: normalizeImovirtualPublishedAt(item.createdAtFirst),
    publishedAt: deriveImovirtualPublishedAt(item),
    modifiedAt: null,
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
