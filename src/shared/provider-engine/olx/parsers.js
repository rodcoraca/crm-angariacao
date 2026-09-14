const OLX_BASE_URL = "https://www.olx.pt";
const CARD_SELECTOR = 'a[data-testid="card-title-link"]';
const NATIVE_PATH = "/d/anuncio/";
const ID_PATTERN = /(?:^|-)IDJ([A-Za-z0-9]+)(?=\.html(?:[?#]|$)|(?:[?#]|$))/i;
const CARD_ANCHOR_PATTERN = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;
const CARD_CONTAINER_PATTERN = /<div\b([^>]*)>/gi;
const CARD_CONTAINER_OPEN_PATTERN = /\bdata-testid\s*=\s*(["'])l-card\1/i;
const PRICE_PATTERN = /<p\b([^>]*)>([\s\S]*?)<\/p\s*>/gi;
const PAGINATION_PATTERN = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function getAttribute(attributes, name) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'\`=<>]+))`, "i");
  const match = String(attributes || "").match(pattern);
  return match ? decodeHtmlEntities(match[1] ?? match[2] ?? match[3] ?? "") : null;
}

function hasAttributeValue(attributes, name, value) {
  return getAttribute(attributes, name)?.toLowerCase() === value.toLowerCase();
}

function textFrom(html) {
  if (!html) return null;
  const withoutIgnoredElements = String(html)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(withoutIgnoredElements).replace(/\s+/g, " ").trim() || null;
}

function findCardFragment(html, startIndex, endIndex, containers) {
  const enclosing = containers.find((container) => startIndex >= container.start && endIndex <= container.end);
  return enclosing?.html || html.slice(startIndex, endIndex);
}

function extractTaggedText(html, pattern, testId) {
  pattern.lastIndex = 0;
  for (const match of html.matchAll(pattern)) {
    if (hasAttributeValue(match[1], "data-testid", testId)) return textFrom(match[2]);
  }
  return null;
}

function normalizeUrl(href) {
  if (!href) return null;
  try {
    return new URL(href, OLX_BASE_URL).toString();
  } catch (_) {
    return null;
  }
}

function isNativeListingUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ["olx.pt", "www.olx.pt"].includes(parsed.hostname.toLowerCase()) && parsed.pathname.startsWith(NATIVE_PATH);
  } catch (_) {
    return false;
  }
}

function isOlxUrl(url) {
  if (!url) return false;
  try {
    return ["olx.pt", "www.olx.pt"].includes(new URL(url).hostname.toLowerCase());
  } catch (_) {
    return false;
  }
}

function extractExternalId(url) {
  const match = url?.match(ID_PATTERN);
  return match ? `IDJ${match[1]}`.trim() : null;
}

function splitLocationDate(value) {
  if (!value) return { location: null, publishedAt: null };
  const separatorIndex = value.lastIndexOf(" - ");
  if (separatorIndex < 0) return { location: value, publishedAt: null };
  const publishedAtText = value.slice(separatorIndex + 3).trim() || null;
  const isPromotionReference = /^Para o topo\b/i.test(publishedAtText || "");
  return {
    location: value.slice(0, separatorIndex).trim() || null,
    publishedAt: isPromotionReference
      ? publishedAtText.replace(/^Para o topo\s+(?:a\s+)?/i, "").trim() || null
      : publishedAtText,
    ...(isPromotionReference ? { publishedAtSource: "promotion" } : {})
  };
}

function createMetrics() {
  return {
    cardsDetected: 0,
    listingsParsed: 0,
    listingsRejected: 0,
    invalidIds: 0,
    externalLinksIgnored: 0,
    duplicatesRemoved: 0,
    nextUrlFound: false
  };
}

export function parseOlxSearchPage(html) {
  const metrics = createMetrics();
  if (typeof html !== "string" || !html.trim()) {
    return { listings: [], nextUrl: null, metrics };
  }

  const cardStarts = [...html.matchAll(CARD_CONTAINER_PATTERN)]
    .filter((match) => CARD_CONTAINER_OPEN_PATTERN.test(match[1]))
    .map((match) => match.index);
  const containers = cardStarts.map((start, index) => {
    const end = cardStarts[index + 1] ?? html.length;
    return { start, end, html: html.slice(start, end) };
  });

  const cards = [];
  for (const match of html.matchAll(CARD_ANCHOR_PATTERN)) {
    if (hasAttributeValue(match[1], "data-testid", "card-title-link")) {
      cards.push({
        attributes: match[1],
        innerHtml: match[2],
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }
  const listings = [];
  const ids = new Set();
  metrics.cardsDetected = cards.length;

  for (const link of cards) {
    const url = normalizeUrl(getAttribute(link.attributes, "href"));
    if (!isNativeListingUrl(url)) {
      metrics.externalLinksIgnored += 1;
      continue;
    }

    const externalId = extractExternalId(new URL(url).pathname + new URL(url).search);
    if (!externalId) {
      metrics.invalidIds += 1;
      metrics.listingsRejected += 1;
      continue;
    }

    if (ids.has(externalId)) {
      metrics.duplicatesRemoved += 1;
      continue;
    }

    const card = findCardFragment(html, link.start, link.end, containers);
    const title = getAttribute(link.attributes, "aria-label")?.replace(/\s+/g, " ").trim() || textFrom(link.innerHtml);
    const price = extractTaggedText(card, PRICE_PATTERN, "ad-price");
    const locationDate = splitLocationDate(extractTaggedText(card, PRICE_PATTERN, "location-date"));

    ids.add(externalId);
    listings.push({
      externalId: String(externalId).trim(),
      title: title || null,
      price,
      location: locationDate.location,
      publishedAt: locationDate.publishedAt,
      ...(locationDate.publishedAtSource ? { publishedAtSource: locationDate.publishedAtSource } : {}),
      url
    });
  }

  let nextHref = null;
  for (const match of html.matchAll(PAGINATION_PATTERN)) {
    if (hasAttributeValue(match[1], "data-testid", "pagination-forward")) {
      nextHref = getAttribute(match[1], "href");
      break;
    }
  }
  const candidateNextUrl = normalizeUrl(nextHref);
  const nextUrl = isOlxUrl(candidateNextUrl) ? candidateNextUrl : null;
  metrics.nextUrlFound = Boolean(nextUrl);
  metrics.listingsParsed = listings.length;

  return { listings, nextUrl, metrics };
}

export const olxSelectors = Object.freeze({
  card: CARD_SELECTOR,
  price: '[data-testid="ad-price"]',
  locationDate: '[data-testid="location-date"]',
  paginationForward: 'a[data-testid="pagination-forward"]'
});