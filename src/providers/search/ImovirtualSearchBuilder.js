/**
 * ImovirtualSearchBuilder
 *
 * Responsabilidade: transformar a configuração do SyncPreparationModal
 * em URLs de pesquisa do Imovirtual prontas a consumir pelo fluxo de
 * paginação (collectImovirtualPaginatedListings).
 *
 * Entrada:
 *   { districts, includePrivateOwners, includeProfessionalOwners }
 *
 * Saída:
 *   string[] — lista de URLs de pesquisa
 *
 * Reutilização: cada provider futuro (OLX, Idealista, Casa Sapo) deverá
 * criar o seu próprio Builder e registá-lo com
 * ProviderSearchBuilder.registerProvider().
 */
import { ProviderSearchBuilder } from "./ProviderSearchBuilder.js";

const BASE_URL = "https://www.imovirtual.com";

// Fonte oficial das categorias do Imovirtual — não repetir noutros pontos.
const IMOVIRTUAL_CATEGORIES = [
  "apartamento",
  "moradia",
  "terreno",
  "armazens",
  "garagem",
  "empreendimentos"
];

// Valores canónicos para o parâmetro ownerTypeSingleSelect do Imovirtual.
const OWNER_TYPES = {
  PRIVATE:      "private",
  PROFESSIONAL: "agency"
};

function normalizeDistrictSlug(district) {
  return String(district).trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Gera URLs de pesquisa do Imovirtual a partir da configuração do utilizador.
 * Devolve [] quando nenhum tipo de anunciante está seleccionado.
 */
export function buildImovirtualSearchUrls({
  districts = [],
  tipologia = "",
  minPrice,
  maxPrice,
  includePrivateOwners = true,
  includeProfessionalOwners = true
} = {}) {
  if (!includePrivateOwners && !includeProfessionalOwners) return [];
  if (IMOVIRTUAL_CATEGORIES.length === 0) return [];

  const targetDistricts = Array.isArray(districts) && districts.length > 0
    ? districts
    : [null];

  const urls = [];
  for (const category of IMOVIRTUAL_CATEGORIES) {
    for (const district of targetDistricts) {
      const pathParts = ["pt", "resultados", "comprar", category];
      if (district) pathParts.push(normalizeDistrictSlug(district));

      const url = new URL(`/${pathParts.join("/")}`, BASE_URL);

      if (includePrivateOwners && !includeProfessionalOwners) {
        url.searchParams.set("ownerTypeSingleSelect", OWNER_TYPES.PRIVATE);
      } else if (!includePrivateOwners && includeProfessionalOwners) {
        url.searchParams.set("ownerTypeSingleSelect", OWNER_TYPES.PROFESSIONAL);
      }

      if (tipologia) {
        url.searchParams.set("tipologia", String(tipologia));
      }
      if (minPrice !== undefined && minPrice !== null && minPrice !== "") {
        url.searchParams.set("minPrice", String(minPrice));
      }
      if (maxPrice !== undefined && maxPrice !== null && maxPrice !== "") {
        url.searchParams.set("maxPrice", String(maxPrice));
      }

      urls.push(url.toString());
    }
  }

  return urls;
}

ProviderSearchBuilder.registerProvider("imovirtual", buildImovirtualSearchUrls);
