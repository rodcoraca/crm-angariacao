const OLX_BASE_URL = "https://www.olx.pt";
const GEO_BREADCRUMB_PREFIX = /^(?:vende-se|arrenda-se|aluga-se|compra-se)\s+-\s+(.+)$/i;

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function textFrom(value) {
  if (!value) return null;
  const text = decodeHtmlEntities(String(value)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<!--[^]*?-->/g, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

function getAttribute(attributes, name) {
  const pattern = new RegExp("\\b" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'`=<>]+))", "i");
  const match = String(attributes || "").match(pattern);
  return match ? decodeHtmlEntities(match[1] ?? match[2] ?? match[3] ?? "") : null;
}

function normalizeUrl(value) {
  if (!value) return null;
  try {
    return new URL(value, OLX_BASE_URL).toString();
  } catch (_) {
    return null;
  }
}

function parseNumber(value) {
  const text = String(value || "").replace(/[^\d,.-]/g, "").trim();
  if (!text) return null;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text.replace(/\./g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function normalizeOwnerName(value) {
  return textFrom(value)?.replace(/No OLX desde[\s\S]*$/i, "").trim() || null;
}

function extractBreadcrumbs(html) {
  const container = html.match(/<ol\b[^>]*data-testid\s*=\s*["']breadcrumbs["'][^>]*>([\s\S]*?)<\/ol\s*>/i)?.[1];
  if (!container) return [];

  return [...container.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)]
    .map((match) => ({
      href: normalizeUrl(getAttribute(match[1], "href")),
      label: textFrom(match[2])
    }))
    .filter((item) => item.href && item.label);
}

function extractGeographicBreadcrumbs(breadcrumbs) {
  return breadcrumbs
    .filter((item) => {
      try {
        const path = new URL(item.href).pathname.split("/").filter(Boolean);
        return path[0] === "imoveis" && path.length >= 4 && GEO_BREADCRUMB_PREFIX.test(item.label);
      } catch (_) {
        return false;
      }
    })
    .map((item) => ({ ...item, location: item.label.match(GEO_BREADCRUMB_PREFIX)[1].trim() }));
}

function extractVisualLocation(html) {
  const marker = html.search(/<img\b[^>]*alt\s*=\s*["']location["']/i);
  if (marker < 0) return { location: null, district: null };
  const fragment = html.slice(marker, marker + 5000);
  const p2 = fragment.match(/<p\b[^>]*data-nx-name\s*=\s*["']P2["'][^>]*>([\s\S]*?)<\/p\s*>/i);
  const p3 = fragment.match(/<p\b[^>]*data-nx-name\s*=\s*["']P3["'][^>]*>([\s\S]*?)<\/p\s*>/i);
  return { location: textFrom(p2?.[1]), district: textFrom(p3?.[1]) };
}

function extractJsonLdLocation(html) {
  const script = html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/i)?.[1];
  if (!script) return null;
  try {
    return JSON.parse(script)?.offers?.areaServed?.name || null;
  } catch (_) {
    return null;
  }
}

function extractPropertyRows(html) {
  return [...html.matchAll(/<p\b[^>]*data-nx-name\s*=\s*["']P3["'][^>]*>([\s\S]*?)<\/p\s*>/gi)]
    .map((match) => textFrom(match[1]))
    .filter(Boolean);
}

function extractTaggedText(html, selectorAttribute, selectorValue, tagName = "div") {
  const pattern = new RegExp(`<${tagName}\\b([^>]*)${selectorAttribute}\\s*=\\s*["']${selectorValue}["'][^>]*>([\\s\\S]*?)<\\/${tagName}\\s*>`, "i");
  return textFrom(html.match(pattern)?.[2]);
}

export function parseOlxDetailPage(html) {
  if (typeof html !== "string" || !html.trim()) {
    return {
      location: null,
      district: null,
      concelho: null,
      freguesia: null,
      area: null,
      rooms: null,
      shortDescription: null,
      ownerName: null,
      isPrivateOwner: null,
      publishedAt: null,
      price: null
    };
  }

  const breadcrumbs = extractGeographicBreadcrumbs(extractBreadcrumbs(html));
  const visualLocation = extractVisualLocation(html);
  const location = breadcrumbs.at(-1)?.location || visualLocation.location || extractJsonLdLocation(html);
  const district = breadcrumbs.length >= 2 ? breadcrumbs.at(-2).location : null;
  const rows = extractPropertyRows(html);
  const usefulArea = rows.find((row) => /^Área útil:/i.test(row));
  const typology = rows.find((row) => /^Tipologia:/i.test(row));
  const postedText = textFrom(html.match(/<span\b[^>]*data-testid\s*=\s*["']ad-posted-at["'][^>]*>([\s\S]*?)<\/span\s*>/i)?.[1]);
  const promotionDate = postedText?.match(/^Para o topo\s+(?:a\s+)?(.+)$/i)?.[1] || null;
  const publishedAt = postedText?.match(/^Publicado\s+(.+)$/i)?.[1] || promotionDate;
  const sellerLink = html.match(/<a\b([^>]*)data-testid\s*=\s*["']user-profile-link["'][^>]*>([\s\S]*?)<\/a\s*>/i);

  return {
    location: location || null,
    district: district || null,
    concelho: null,
    freguesia: null,
    area: parseNumber(usefulArea?.replace(/^Área útil:\s*/i, "")),
    rooms: parseNumber(typology?.replace(/^Tipologia:\s*/i, "")),
    shortDescription: extractTaggedText(html, "data-testid", "ad_description"),
    ownerName: normalizeOwnerName(sellerLink?.[2]),
    isPrivateOwner: null,
    publishedAt,
    ...(promotionDate ? { publishedAtSource: "promotion" } : {}),
    price: parseNumber(extractTaggedText(html, "data-testid", "ad-price-container" , "div"))
  };
}

export const olxDetailSelectors = Object.freeze({
  breadcrumbs: '[data-testid="breadcrumbs"]',
  breadcrumbItem: '[data-testid="breadcrumb-item"]',
  visualLocation: 'img[alt="Location"]',
  propertyRow: 'p[data-nx-name="P3"]',
  description: '[data-testid="ad_description"]',
  seller: '[data-testid="user-profile-link"]',
  publishedAt: '[data-testid="ad-posted-at"]',
  jsonLd: 'script[type="application/ld+json"]'
});