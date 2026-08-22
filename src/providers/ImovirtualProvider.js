import { createLead, findByExternalId } from "../services/providerLeadService.js";
import { calcularScoreInteligente } from "../modules/radar/services/radarScoreService.js";
import {
  parseListingIds,
  extractNextData,
  extractListings,
  buildImovirtualPublicUrl,
  imovirtualListingSelectors
} from "../shared/provider-engine/index.js";

export function extractTipologiaFromDetailHtml(html) {
  if (typeof html !== "string" || html.length === 0) return null;

  const normalizedHtml = html
    .replace(/&nbsp;/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedHtml) return null;

  const labelMatch = normalizedHtml.match(/Tipologia\s*[:\-]?\s*([TV](?:0|[1-9]\d*)(?:\+)?)/i);
  if (labelMatch) {
    const value = labelMatch[1].trim().toUpperCase();
    return /^(?:T|V)(?:0|[1-9]\d*)(?:\+)?$/.test(value) ? value : null;
  }

  const descriptionMatch = normalizedHtml.match(/(?:tipologia|tipologia comercial)\s*[:\-]?\s*([TV](?:0|[1-9]\d*)(?:\+)?)/i);
  if (descriptionMatch) {
    const value = descriptionMatch[1].trim().toUpperCase();
    return /^(?:T|V)(?:0|[1-9]\d*)(?:\+)?$/.test(value) ? value : null;
  }

  return null;
}

export function extractModifiedAtFromDetailHtml(html) {
  if (typeof html !== "string" || html.length === 0) return null;

  const normalizedHtml = html
    .replace(/&nbsp;/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedHtml) return null;

  const match = normalizedHtml.match(
    /(?:Última\s+atualização|Last\s+update|Last\s+updated|Updated|Atualização)\s*[:\-]?\s*([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4})/i
  );

  if (!match || !match[1]) return null;

  const rawValue = match[1].trim();
  const parts = rawValue.split(/[./-]/).map((part) => part.trim());
  if (parts.length !== 3) return null;

  const [dayPart, monthPart, yearPart] = parts;
  const day = Number(dayPart);
  const month = Number(monthPart);
  const year = Number(yearPart);

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  const resolvedYear = year < 100 ? 2000 + year : year;
  const utcDate = new Date(Date.UTC(resolvedYear, month - 1, day, 0, 0, 0));

  if (Number.isNaN(utcDate.getTime())) return null;

  return utcDate.toISOString();
}

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


    const fetchImplementation = this.options.fetch || globalThis.fetch || (typeof window !== "undefined" ? window.fetch : null);
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

      const score = calcularScoreInteligente({
        created_at_first: listing.createdAtFirst,
        is_private_owner: listing.isPrivateOwner === true,
        distrito: listing.district,
        owner_name: listing.ownerName
      });

      let tipologia = null;
      let modifiedAt = null;
      try {
        const detailUrl = listing.url || `https://www.imovirtual.com/pt/anuncio/${listing.externalId}`;
        const fetchImplementation = this.options.fetch || globalThis.fetch || (typeof window !== "undefined" ? window.fetch : null);
        if (typeof fetchImplementation === "function") {
          const detailResponse = await fetchImplementation(detailUrl);
          if (detailResponse && detailResponse.ok) {
            const detailHtml = await detailResponse.text();
            tipologia = extractTipologiaFromDetailHtml(detailHtml);
            modifiedAt = extractModifiedAtFromDetailHtml(detailHtml);
          }
        }
      } catch (error) {
        tipologia = null;
        modifiedAt = null;
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
        score,
        created_at_first: listing.createdAtFirst,
        modified_at: modifiedAt,
        short_description: listing.shortDescription,
        source: listing.source,
        status: "new",
        detected_at: fetchedAt,
        raw_data: { ...listing, tipologia, modifiedAt }
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

export {
  parseListingIds,
  extractNextData,
  extractListings,
  buildImovirtualPublicUrl,
  imovirtualListingSelectors
};

