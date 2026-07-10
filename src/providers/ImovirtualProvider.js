import { createLead, findByExternalId } from "../services/providerLeadService";

/**
 * Contrato de provider para futuras integrações com o Imovirtual.
 * Não realiza chamadas de rede nem contém lógica de scraping.
 */
export class ImovirtualProvider {
  constructor(options = {}) {
    this.name = "imovirtual";
    this.options = options;
  }

  log(event, details = {}) {
    if (this.options.enableLogs !== true) return;

    const logger = this.options.logger || console;
    if (typeof logger.info === "function") {
      logger.info("[ImovirtualProvider]", event, details);
    }
  }

  async fetchSearchPage({ district, municipality, propertyType, page } = {}) {
    if (!district || !Number.isInteger(page) || page < 1) {
      throw new Error("district e page (inteiro >= 1) são obrigatórios.");
    }

    const baseUrl = this.options.baseUrl || "https://www.imovirtual.com";
    const pathSegments = ["pt", "resultados", "comprar"];
    if (propertyType) pathSegments.push(propertyType);
    pathSegments.push(district);
    if (municipality) pathSegments.push(municipality);
    const searchUrl = new URL(
      `/${pathSegments.map((segment) => encodeURIComponent(segment)).join("/")}`,
      baseUrl
    );
    searchUrl.searchParams.set("page", String(page));

    const fetchImplementation = this.options.fetch || globalThis.fetch;
    if (typeof fetchImplementation !== "function") {
      throw new Error("Fetch API indisponível para obter a página de pesquisa.");
    }

    this.log("fetch_search_page_started", { district, municipality, propertyType, page });

    try {
      const response = await fetchImplementation(searchUrl.toString());
      if (!response.ok) {
        const error = new Error(`Falha ao obter página de pesquisa do Imovirtual (HTTP ${response.status}).`);
        error.statusCode = response.status;
        throw error;
      }

      const html = await response.text();
      const fetchedAt = new Date().toISOString();
      this.lastFetchStatusCode = response.status;
      this.log("fetch_search_page_succeeded", { page, fetchedAt });
      return { html, fetchedAt };
    } catch (error) {
      this.log("fetch_search_page_failed", { page, message: error.message });
      throw error;
    }
  }

  async testConnection(params = { district: "porto", page: 1 }) {
    try {
      const { html, fetchedAt } = await this.fetchSearchPage(params);
      return {
        success: true,
        statusCode: this.lastFetchStatusCode || 200,
        htmlLength: html.length,
        fetchedAt
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || String(error),
        statusCode: error.statusCode || this.lastFetchStatusCode || null
      };
    }
  }

  async discover() {
    // TODO: obter e normalizar anúncios particulares do provider.
    return [];
  }

  async getLatestAds() {
    // TODO: devolver os anúncios mais recentes já normalizados.
    return [];
  }

  async sync() {
    const { html, fetchedAt } = await this.fetchSearchPage({ district: "porto", page: 1 });
    const listings = extractListings(extractNextData(html));
    let created = 0;
    let skipped = 0;
    const errors = [];

    this.log("sync_listings_extracted", { totalListings: listings.length });

    for (const listing of listings) {
      const existing = await findByExternalId(this.name, listing.externalId);
      if (existing.error) {
        errors.push({ externalId: listing.externalId, error: existing.error.message });
        continue;
      }

      if (existing.data) {
        skipped += 1;
        continue;
      }

      const result = await createLead({
        provider: this.name,
        external_id: listing.externalId,
        title: listing.title,
        price: listing.price,
        location: [listing.city, listing.district].filter(Boolean).join(", ") || null,
        url: listing.url,
        area: listing.area,
        rooms: listing.rooms,
        city: listing.city,
        district: listing.district,
        owner_name: listing.ownerName,
        is_private_owner: listing.isPrivateOwner,
        created_at_first: listing.createdAtFirst,
        short_description: listing.shortDescription,
        source: listing.source,
        status: "new",
        detected_at: fetchedAt,
        raw_data: listing
      });

      if (result.error) {
        errors.push({ externalId: listing.externalId, error: result.error.message });
      } else {
        created += 1;
      }
    }

    return {
      provider: this.name,
      discovered: listings.length,
      privateOwners: listings.filter((listing) => listing.isPrivateOwner).length,
      created,
      skipped,
      errors,
      listings
    };
  }
}

export default ImovirtualProvider;

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

/**
 * Extrai campos públicos dos cartões de anúncios do HTML de pesquisa.
 * Requer a API DOMParser disponível no browser ou no runtime de teste.
 */
export function parseListingIds(html) {
  if (!html || typeof DOMParser === "undefined") {
    console.info("[ImovirtualProvider] parse_listing_ids", { totalListings: 0 });
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

  console.info("[ImovirtualProvider] parse_listing_ids", { totalListings: listings.length });
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
    console.info("[ImovirtualProvider] extract_next_data_failed", { message: error.message });
    return null;
  }
}

export function extractListings(nextData) {
  const items = nextData?.props?.pageProps?.data?.searchAds?.items;
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item?.id && item?.href)
    .map((item) => ({
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
    }));
}

export function buildImovirtualPublicUrl(href) {
  if (!href) return null;

  const normalizedPath = String(href)
    .replace("[lang]", "pt")
    .replace("/ad/", "/anuncio/");
  return new URL(normalizedPath, "https://www.imovirtual.com").toString();
}

export const imovirtualListingSelectors = {
  listing: LISTING_SELECTORS,
  title: TITLE_SELECTOR,
  price: PRICE_SELECTOR,
  location: LOCATION_SELECTOR,
  link: LISTING_LINK_SELECTOR
};
