/**
 * CustoJusto parsers
 *
 * Responsabilidade:
 * - Extrair os dados estruturados listItems do HTML do CustoJusto.
 * - Normalizar apenas os campos utilizados pelo OSFlow.
 * - Extrair a URL da próxima página através de <link rel="next">.
 *
 * NÃO é responsabilidade deste módulo:
 * - fazer requests HTTP;
 * - persistir dados;
 * - comunicar com Supabase;
 * - executar paginação;
 * - alterar providers existentes.
 */

const CUSTOJUSTO_BASE_URL = "https://www.custojusto.pt";

/**
 * Encontra o fim de um valor JSON começando num determinado índice.
 *
 * É necessário porque o HTML do CustoJusto contém o objeto estruturado
 * dentro de scripts da aplicação Next.js e não num <script type="application/json">
 * simples que possamos assumir como estável.
 */
function findJsonValueEnd(text, startIndex) {
  const firstChar = text[startIndex];

  if (firstChar !== "[" && firstChar !== "{") {
    throw new Error(
      `JSON value must start with [ or { at index ${startIndex}`
    );
  }

  const stack = [firstChar === "[" ? "]" : "}"];
  let inString = false;
  let escaped = false;

  for (let index = startIndex + 1; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "[" ) {
      stack.push("]");
      continue;
    }

    if (char === "{") {
      stack.push("}");
      continue;
    }

    if (char === "]" || char === "}") {
      const expected = stack[stack.length - 1];

      if (char !== expected) {
        throw new Error(
          `Invalid JSON structure near index ${index}`
        );
      }

      stack.pop();

      if (stack.length === 0) {
        return index;
      }
    }
  }

  throw new Error("Could not find end of JSON value.");
}

/**
 * Extrai listItems do HTML real do CustoJusto.
 */
export function extractCustoJustoListItems(html) {
  if (typeof html !== "string" || !html.trim()) {
    return [];
  }

  const marker = '"listItems":[';
  const markerIndex = html.indexOf(marker);

  if (markerIndex === -1) {
    return [];
  }

  const arrayStart = markerIndex + '"listItems":'.length;

  const arrayEnd = findJsonValueEnd(html, arrayStart);

  const json = html.slice(arrayStart, arrayEnd + 1);

  const parsed = JSON.parse(json);

  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Extrai a URL da página seguinte fornecida pelo próprio CustoJusto.
 *
 * Exemplo:
 * <link rel="next"
 *       href="https://www.custojusto.pt/porto/...?...&o=2">
 */
export function extractCustoJustoNextUrl(html) {
  if (typeof html !== "string" || !html.trim()) {
    return null;
  }

  const match = html.match(
    /<link\b[^>]*\brel=["']next["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i
  );

  if (!match) {
    return null;
  }

  return new URL(match[1], CUSTOJUSTO_BASE_URL).toString();
}

/**
 * Converte o valor de área do CustoJusto para numeric.
 *
 * Exemplos:
 *   "112m²"    -> 112
 *   "143 m²"   -> 143
 *   "112,5m²"  -> 112.5
 */
function parseArea(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = String(value)
    .trim()
    .replace(/\s+/g, "")
    .replace(/m²/gi, "");

  if (!normalized) {
    return null;
  }

  const numberMatch = normalized.match(/[\d.,]+/);

  if (!numberMatch) {
    return null;
  }

  let numberValue = numberMatch[0];

  /*
   * Formato português:
   * 112,5 -> 112.5
   */
  if (numberValue.includes(",") && numberValue.includes(".")) {
    numberValue = numberValue
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (numberValue.includes(",")) {
    numberValue = numberValue.replace(",", ".");
  } else if (
    numberValue.includes(".") &&
    /^\d{1,3}(\.\d{3})+$/.test(numberValue)
  ) {
    /*
     * 1.234 -> 1234
     */
    numberValue = numberValue.replace(/\./g, "");
  }

  const parsed = Number(numberValue);

  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Normaliza uma URL do CustoJusto.
 */
function normalizeUrl(value) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, CUSTOJUSTO_BASE_URL).toString();
  } catch {
    return null;
  }
}

/**
 * Normaliza um anúncio individual do CustoJusto.
 *
 * IMPORTANTE:
 * Somente os campos necessários ao modelo OSFlow são devolvidos.
 */
export function normalizeCustoJustoListing(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const externalId =
    item.listID !== null && item.listID !== undefined
      ? String(item.listID).trim()
      : "";

  const url = normalizeUrl(item.url);

  if (!externalId || !url) {
    return null;
  }

  const locationNames = item.locationNames || {};
  const params = item.params || {};

  return {
    externalId,
    title: item.title ? String(item.title).trim() : null,
    shortDescription: item.body
      ? String(item.body).trim()
      : null,

    price:
      item.price !== null &&
      item.price !== undefined &&
      Number.isFinite(Number(item.price))
        ? Number(item.price)
        : null,

    url,

    ownerName: item.name
      ? String(item.name).trim()
      : null,

    isPrivateOwner:
      item.companyAd === true
        ? false
        : item.companyAd === false
          ? true
          : null,

    createdAtFirst: item.listTime || null,
    modifiedAt: null,

    district: locationNames.district
      ? String(locationNames.district).trim()
      : null,

    concelho: locationNames.county
      ? String(locationNames.county).trim()
      : null,

    freguesia: locationNames.parish
      ? String(locationNames.parish).trim()
      : null,

    area: parseArea(params.size),

    rooms: params.rooms
      ? String(params.rooms).trim()
      : null,

    imageUrl: item.imageFullURL
      ? String(item.imageFullURL).trim()
      : null,

    source: "custojusto"
  };
}

/**
 * Faz o parsing completo de uma página de pesquisa do CustoJusto.
 *
 * Retorna:
 * {
 *   listings: [],
 *   nextUrl: string | null
 * }
 */
export function parseCustoJustoSearchPage(html) {
  const items = extractCustoJustoListItems(html);

  const listings = items
    .map(normalizeCustoJustoListing)
    .filter(Boolean);

  return {
    listings,
    nextUrl: extractCustoJustoNextUrl(html)
  };
}
