import { createLead, findByExternalId } from "../services/providerLeadService.js";
import { calcularScoreInteligente } from "../modules/radar/services/radarScoreService.js";
import {
  parseListingIds,
  extractNextData,
  extractListings,
  buildImovirtualPublicUrl,
  imovirtualListingSelectors
} from "../shared/provider-engine/index.js";

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

export {
  parseListingIds,
  extractNextData,
  extractListings,
  buildImovirtualPublicUrl,
  imovirtualListingSelectors
};

