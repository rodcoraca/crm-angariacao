/**
 * CustoJustoSearchBuilder
 *
 * Responsabilidade: transformar a configuração do SyncPreparationModal
 * em URLs de pesquisa do CustoJusto prontas a consumir pelo fluxo de
 * aquisição/paginação.
 *
 * Entrada:
 *   { districts, includePrivateOwners, includeProfessionalOwners }
 *
 * Saída:
 *   string[] — lista de URLs de pesquisa
 *
 * Paginação:
 *   NÃO é responsabilidade deste Builder.
 *   A página seguinte deverá preservar a URL de pesquisa e alterar
 *   exclusivamente o parâmetro "o".
 *
 * Reutilização:
 *   Registo através de ProviderSearchBuilder.registerProvider().
 */

import { ProviderSearchBuilder } from "./ProviderSearchBuilder.js";

const BASE_URL = "https://www.custojusto.pt";

// Categorias imobiliárias atualmente previstas para a primeira versão.
// Não incluir categorias adicionais até serem necessárias pelo Sync atual.
const CUSTOJUSTO_CATEGORIES = [
  "apartamentos-venda"
];

// Parâmetros de anunciante confirmados no CustoJusto.
// "f=p" foi validado para particulares.
// O filtro de profissionais ainda não foi confirmado e,
// por isso, não é aplicado neste Builder.
const OWNER_FILTERS = {
  PRIVATE: "p",
  PROFESSIONAL: "c"
};

/**
 * Gera URLs de pesquisa do CustoJusto a partir da configuração
 * do utilizador.
 *
 * Devolve [] quando nenhum tipo de anunciante está selecionado.
 */
export function buildCustoJustoSearchUrls({
  districts = [],
  includePrivateOwners = true,
  includeProfessionalOwners = true
} = {}) {
  if (!includePrivateOwners && !includeProfessionalOwners) {
    return [];
  }

  if (CUSTOJUSTO_CATEGORIES.length === 0) {
    return [];
  }

  const url = new URL(
    "/portugal/imobiliario/apartamentos-venda",
    BASE_URL
  );

  /*
   * Apenas particulares:
   * CustoJusto utiliza f=p para esta pesquisa.
   */
  if (includePrivateOwners && !includeProfessionalOwners) {
    url.searchParams.set("f", OWNER_FILTERS.PRIVATE);
  } else if (!includePrivateOwners && includeProfessionalOwners) {
    url.searchParams.set("f", OWNER_FILTERS.PROFESSIONAL);
  }

  return [url.toString()];
}

ProviderSearchBuilder.registerProvider(
  "custojusto",
  buildCustoJustoSearchUrls
);