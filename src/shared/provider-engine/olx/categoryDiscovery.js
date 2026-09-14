const OLX_HOSTNAMES = new Set(["olx.pt", "www.olx.pt"]);
const CATEGORY_CONTAINER_SELECTOR = '[data-testid="category-count-links"]';
const CATEGORY_LINK_SELECTOR = `${CATEGORY_CONTAINER_SELECTOR} a[href]`;
const IMOVIES_ROOT_PATH = "/imoveis/";
const CATEGORY_CONTAINER_PATTERN = /<ul\b[^>]*\bdata-testid\s*=\s*(["'])category-count-links\1[^>]*>([\s\S]*?)<\/ul\s*>/gi;
const CATEGORY_LINK_PATTERN = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;
const HREF_ATTRIBUTE_PATTERN = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/i;

function createMetrics() {
  return {
    linksInspected: 0,
    categoriesFound: 0,
    duplicatesRemoved: 0,
    externalLinksIgnored: 0,
    invalidLinksIgnored: 0
  };
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&quot;/gi, "\"")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function cleanText(html) {
  if (!html) return null;
  const withoutIgnoredElements = String(html)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<[^>]*\bdata-nx-name\s*=\s*(["'])Label1\1[^>]*>[\s\S]*?<\/[^>]+\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  return decodeHtmlEntities(withoutIgnoredElements).replace(/\s+/g, " ").trim() || null;
}

function extractHref(attributes) {
  const match = String(attributes || "").match(HREF_ATTRIBUTE_PATTERN);
  return match ? (match[1] ?? match[2] ?? match[3] ?? null) : null;
}

export function normalizeOlxCategoryUrl(href) {
  if (!href) return null;
  let url;
  try {
    url = new URL(href, "https://www.olx.pt");
  } catch (_) {
    return null;
  }

  if (url.protocol !== "https:" || !OLX_HOSTNAMES.has(url.hostname.toLowerCase())) return null;
  if (!url.pathname.startsWith(IMOVIES_ROOT_PATH) || url.pathname === IMOVIES_ROOT_PATH) return null;
  if (url.pathname.startsWith("/imoveis/q-") || url.pathname.startsWith("/imoveis/d/") || url.pathname.startsWith("/imoveis/popular-searches/")) return null;

  url.search = "";
  url.hash = "";
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
  return url.toString();
}

function slugFromUrl(url) {
  const segment = new URL(url).pathname.split("/").filter(Boolean).pop();
  if (!segment || !/^[a-z0-9][a-z0-9_-]*$/i.test(segment)) return null;
  return decodeURIComponent(segment);
}

export function discoverOlxCategories(html) {
  const metrics = createMetrics();
  if (typeof html !== "string" || !html.trim()) {
    return { categories: [], metrics };
  }

  const categories = [];
  const urls = new Set();
  const categoryContainers = html.matchAll(CATEGORY_CONTAINER_PATTERN);

  for (const container of categoryContainers) {
    const links = String(container[2] || "").matchAll(CATEGORY_LINK_PATTERN);
    for (const link of links) {
      metrics.linksInspected += 1;
      const href = extractHref(link[1]);
      let candidateUrl = null;
      try {
        candidateUrl = href ? new URL(href, "https://www.olx.pt") : null;
      } catch (_) {
        candidateUrl = null;
      }

      if (candidateUrl && !OLX_HOSTNAMES.has(candidateUrl.hostname.toLowerCase())) {
        metrics.externalLinksIgnored += 1;
        continue;
      }

      const url = normalizeOlxCategoryUrl(href);
      const name = cleanText(link[2]);
      const slug = url ? slugFromUrl(url) : null;
      if (!url || !name || !slug) {
        metrics.invalidLinksIgnored += 1;
        continue;
      }

      if (urls.has(url)) {
        metrics.duplicatesRemoved += 1;
        continue;
      }

      urls.add(url);
      categories.push({ name, url, slug });
    }
  }

  metrics.categoriesFound = categories.length;
  return { categories, metrics };
}

export const olxCategoryDiscoverySelectors = Object.freeze({
  categoryContainer: CATEGORY_CONTAINER_SELECTOR,
  categoryLink: CATEGORY_LINK_SELECTOR
});