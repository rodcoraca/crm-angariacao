import { ProviderSearchBuilder } from "./ProviderSearchBuilder.js";

const BASE_URL = "https://www.idealista.pt";

const IDEALISTA_CATEGORIES = [
  { label: "Casas e Apartamentos", path: "comprar-casas" },
  { label: "Garagens", path: "comprar-garagens" },
  { label: "Escritórios", path: "comprar-escritorios" },
  { label: "Espaços Comerciais ou Armazéns", path: "comprar-lojas_ou_armazens" },
  { label: "Trespasses", path: "trespasse" },
  { label: "Terrenos", path: "comprar-terrenos" },
  { label: "Prédios", path: "comprar-predios" }
];

const DISTRICT_OVERRIDES = {
  porto: "porto-distrito",
  "porto-distrito": "porto-distrito",
  braga: "braga-distrito",
  "braga-distrito": "braga-distrito",
  aveiro: "aveiro-distrito",
  "aveiro-distrito": "aveiro-distrito",
  lisboa: "lisboa-distrito",
  "lisboa-distrito": "lisboa-distrito",
  faro: "faro-distrito",
  "faro-distrito": "faro-distrito"
};

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2019']/g, "")
    .toLowerCase();
}

function slugify(value) {
  const normalized = normalizeText(value)
    .replace(/&/g, "e")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || null;
}

function resolveIdealistaDistrictSlug(district) {
  if (district === null || district === undefined) return null;

  const raw = String(district).trim();
  if (!raw) return null;

  const canonicalKey = normalizeText(raw);
  if (DISTRICT_OVERRIDES[canonicalKey]) {
    return DISTRICT_OVERRIDES[canonicalKey];
  }

  const directSlug = slugify(raw);
  if (!directSlug) return null;

  if (directSlug.endsWith("-distrito")) return directSlug;

  if (directSlug === "porto") return "porto-distrito";
  if (directSlug === "braga") return "braga-distrito";
  if (directSlug === "aveiro") return "aveiro-distrito";
  if (directSlug === "lisboa") return "lisboa-distrito";
  if (directSlug === "faro") return "faro-distrito";

  return directSlug;
}

export function buildIdealistaSearchUrls({
  districts = [],
  includePrivateOwners = true,
  includeProfessionalOwners = true
} = {}) {
  if (!includePrivateOwners && !includeProfessionalOwners) {
    return [];
  }

  if (!Array.isArray(districts) || districts.length === 0) {
    return [];
  }

  const resolvedDistricts = [];
  const seen = new Set();

  for (const district of districts) {
    const resolved = resolveIdealistaDistrictSlug(district);
    if (!resolved || seen.has(resolved)) continue;
    seen.add(resolved);
    resolvedDistricts.push(resolved);
  }

  if (resolvedDistricts.length === 0) {
    return [];
  }

  const urls = [];
  for (const category of IDEALISTA_CATEGORIES) {
    for (const districtSlug of resolvedDistricts) {
      const url = new URL(`/${category.path}/${districtSlug}/`, BASE_URL);
      urls.push(url.toString());
    }
  }

  return urls;
}

ProviderSearchBuilder.registerProvider("idealista", buildIdealistaSearchUrls);
