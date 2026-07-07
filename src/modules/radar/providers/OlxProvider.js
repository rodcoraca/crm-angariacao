import { RadarProvider } from "./RadarProvider";
import { MockRadarProvider } from "./MockRadarProvider";
import { buildRadarLeadMetadata } from "../contracts/radarLeadMetadata";
import { ensureOlxAccessToken } from "../../integrations";

const OLX_API_BASE_URL = "https://www.olx.pt";
const OLX_ADVERTS_PATH = "/api/partner/adverts";
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGES = 20;
const REQUEST_TIMEOUT_MS = 15000;
let fallbackLogged = false;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toNullableText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableIso(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function pickFirstDefined(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }

  return null;
}

function normalizeImages(rawImages) {
  if (!Array.isArray(rawImages)) return [];

  return rawImages
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        const url = toNullableText(item);
        return url ? { url } : null;
      }

      if (isPlainObject(item)) {
        const url = toNullableText(
          pickFirstDefined(item.url, item.src, item.image_url, item.large_url, item.small_url)
        );
        if (!url) return null;

        return {
          url,
          title: toNullableText(pickFirstDefined(item.title, item.name))
        };
      }

      return null;
    })
    .filter(Boolean);
}

function readAttributeValue(attributes, candidateCodes) {
  if (!Array.isArray(attributes) || !candidateCodes.length) return null;

  const wanted = new Set(candidateCodes.map((code) => String(code).toLowerCase()));

  for (const attribute of attributes) {
    if (!isPlainObject(attribute)) continue;

    const code = toNullableText(attribute.code || attribute.name || attribute.key);
    if (!code || !wanted.has(code.toLowerCase())) continue;

    return pickFirstDefined(
      attribute.value,
      Array.isArray(attribute.values) ? attribute.values[0] : null,
      attribute.text
    );
  }

  return null;
}

function normalizeLocation(raw) {
  const location = isPlainObject(raw?.location) ? raw.location : {};
  const city = pickFirstDefined(
    location.city?.name,
    location.city,
    raw?.city?.name,
    raw?.city,
    raw?.municipality,
    raw?.location_name
  );
  const district = pickFirstDefined(location.district?.name, location.district, raw?.district?.name, raw?.district);
  const street = pickFirstDefined(location.street, location.address, raw?.address, raw?.street);

  const morada = toNullableText(pickFirstDefined(street, district, city));
  const cidade = toNullableText(city);
  const localizacao = toNullableText([street, district, cidade].filter(Boolean).join(", "));

  return {
    morada,
    cidade,
    localizacao,
    coordenadas: isPlainObject(location)
      ? {
          lat: toNullableNumber(pickFirstDefined(location.latitude, location.lat)),
          lng: toNullableNumber(pickFirstDefined(location.longitude, location.lng))
        }
      : null
  };
}

function normalizeAdvertiser(raw) {
  const contact = isPlainObject(raw?.contact) ? raw.contact : {};
  const business = isPlainObject(raw?.business) ? raw.business : {};

  const name = pickFirstDefined(
    contact.name,
    contact.person,
    contact.contact_name,
    business.name,
    raw?.advertiser_name,
    raw?.seller_name
  );

  const phone = pickFirstDefined(contact.phone, contact.phones?.[0], raw?.phone);
  const email = pickFirstDefined(contact.email, contact.emails?.[0], raw?.email);

  return {
    anunciante: toNullableText(name),
    anunciante_nome: toNullableText(name),
    contacto: {
      telefone: toNullableText(phone),
      email: toNullableText(email)
    }
  };
}

function normalizePrice(raw) {
  const price = raw?.price;

  if (isPlainObject(price)) {
    return toNullableNumber(pickFirstDefined(price.value, price.amount, price.price, price.min, price.max));
  }

  return toNullableNumber(price);
}

function normalizeArea(raw) {
  return toNullableNumber(
    pickFirstDefined(
      raw?.area,
      raw?.surface,
      raw?.size,
      readAttributeValue(raw?.attributes, ["area", "surface", "size", "m2", "sqm"]),
      readAttributeValue(raw?.attributes, ["surface_m2", "area_m2"])
    )
  );
}

function normalizeRooms(raw) {
  return toNullableNumber(
    pickFirstDefined(
      raw?.rooms,
      raw?.bedrooms,
      raw?.quartos,
      readAttributeValue(raw?.attributes, ["rooms", "bedrooms", "quartos", "bedroom_count"])
    )
  );
}

function normalizeType(raw, fallbackType) {
  return toNullableText(
    pickFirstDefined(raw?.type, raw?.property_type, raw?.category?.name, raw?.category_name, fallbackType)
  );
}

function normalizeAdvert(raw, collectedAtIso) {
  const externalId = toNullableText(pickFirstDefined(raw?.external_id, raw?.externalId, raw?.id, raw?.advert_id));
  const id = toNullableText(
    pickFirstDefined(
      raw?.id,
      externalId ? `olx-${externalId}` : null,
      `olx-${Math.random().toString(36).slice(2, 10)}`
    )
  );
  const url = toNullableText(pickFirstDefined(raw?.url, raw?.ad_url, raw?.external_url, raw?.listing_url));
  const title = toNullableText(pickFirstDefined(raw?.title, raw?.name, raw?.headline, raw?.subject));
  const description = toNullableText(pickFirstDefined(raw?.description, raw?.desc, raw?.body));
  const publishedAt = toNullableIso(
    pickFirstDefined(
      raw?.published_at,
      raw?.publishedAt,
      raw?.created_at,
      raw?.createdAt,
      raw?.activated_at,
      raw?.activatedAt
    )
  );
  const location = normalizeLocation(raw);
  const advertiser = normalizeAdvertiser(raw);
  const images = normalizeImages(pickFirstDefined(raw?.images, raw?.photos, raw?.media, raw?.gallery, []));
  const score = toNullableNumber(raw?.score);

  return {
    id,
    id_externo: externalId,
    origem: "OLX.pt",
    url,
    url_original: url,
    titulo: title,
    tipo: normalizeType(raw, "Imóvel"),
    morada: location.morada,
    cidade: location.cidade,
    localizacao: location.localizacao,
    preco: normalizePrice(raw),
    area: normalizeArea(raw),
    quartos: normalizeRooms(raw),
    data_publicacao: publishedAt,
    publicado_em: publishedAt,
    encontrado_em: collectedAtIso,
    data_recolha: collectedAtIso,
    descricao: description,
    imagens: images,
    images,
    ...advertiser,
    score: score ?? 0,
    estado: "novo",
    coordenadas: location.coordenadas,
    olx_status: toNullableText(raw?.status),
    radarLeadMetadata: buildRadarLeadMetadata({
      provider: "OLX.pt",
      externalId,
      url,
      publisherName: advertiser.anunciante_nome,
      publisherContact: advertiser.contacto.telefone || advertiser.contacto.email || "",
      publishedAt,
      capturedAt: collectedAtIso,
      score: score ?? 0,
      status: "novo"
    })
  };
}

function extractAdvertArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchOlxAdvertsPage(fetchImpl, accessToken, offset, limit) {
  const url = new URL(`${OLX_API_BASE_URL}${OLX_ADVERTS_PATH}`);
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", String(limit));

  const supportsAbort = typeof AbortController !== "undefined";
  const controller = supportsAbort ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => {
        controller.abort();
      }, REQUEST_TIMEOUT_MS)
    : null;

  let response;

  try {
    response = await fetchImpl(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        Version: "2.0"
      },
      ...(controller ? { signal: controller.signal } : {})
    });
  } catch (error) {
    if (controller?.signal?.aborted) {
      throw new Error("OLX API timeout.");
    }

    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  const body = await parseJsonResponse(response);

  if (!response.ok) {
    const detail =
      body?.error?.detail ||
      body?.error_description ||
      body?.message ||
      `OLX API indisponível (${response.status}).`;

    throw new Error(detail);
  }

  return extractAdvertArray(body);
}

async function loadOlxAdverts(fetchImpl) {
  const session = await ensureOlxAccessToken({ fetchImpl });
  const accessToken = toNullableText(session?.accessToken);

  if (!accessToken) {
    throw new Error("Access token do OLX em falta.");
  }

  const collectedAtIso = new Date().toISOString();
  const adverts = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const offset = page * DEFAULT_PAGE_SIZE;
    const pageItems = await fetchOlxAdvertsPage(fetchImpl, accessToken, offset, DEFAULT_PAGE_SIZE);

    if (!pageItems.length) {
      break;
    }

    adverts.push(...pageItems.map((item) => normalizeAdvert(item, collectedAtIso)).filter(Boolean));

    if (pageItems.length < DEFAULT_PAGE_SIZE) {
      break;
    }
  }

  return adverts;
}

function logOlxFallbackOnce(error) {
  if (fallbackLogged) return;
  fallbackLogged = true;

  const message = error?.message || error?.detail || String(error || "OLX fallback activated.");

  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(`[Radar][OLX] Fallback para MockProvider ativado: ${message}`);
  }
}

export class OlxProvider extends RadarProvider {
  constructor(options = {}) {
    super();
    this.fetchImpl = options.fetchImpl || (typeof fetch !== "undefined" ? fetch.bind(window) : null);
    this.fallbackProvider = options.fallbackProvider || new MockRadarProvider();
  }

  async ensureOAuthSession() {
    return ensureOlxAccessToken({ fetchImpl: this.fetchImpl });
  }

  async listOpportunities() {
    if (!this.fetchImpl) {
      logOlxFallbackOnce(new Error("Fetch indisponível."));
      return this.fallbackProvider.listOpportunities();
    }

    try {
      return await loadOlxAdverts(this.fetchImpl);
    } catch (error) {
      logOlxFallbackOnce(error);
      return this.fallbackProvider.listOpportunities();
    }
  }
}
