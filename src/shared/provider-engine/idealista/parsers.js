const IDEALISTA_BASE_URL = "https://www.idealista.pt";

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).replace(/\s+/g, " ").trim();
  return normalized || null;
}

function parseNumeric(value) {
  if (value === null || value === undefined || value === "") return null;
  const plain = String(value)
    .replace(/[^\d,\.]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  if (!plain) return null;
  const parsed = Number(plain);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseArea(rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === "") return null;
  const areaSource = rawValue?.value ?? rawValue?.amount ?? rawValue?.sqm ?? rawValue?.m2 ?? rawValue;
  return parseNumeric(areaSource);
}

function normalizeUrl(value) {
  if (!value) return null;
  try {
    return new URL(String(value), IDEALISTA_BASE_URL).toString();
  } catch {
    return null;
  }
}

function parseDate(value) {
  if (!value) return null;

  const dateValue = String(value).trim();
  if (!dateValue) return null;

  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function getNestedValue(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function parseOwnerType(value) {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined || value === "") return null;

  const normalized = String(value).trim().toLowerCase();
  if (["particular", "private", "owner", "individual"].includes(normalized)) return true;
  if (["profissional", "professional", "agency", "agencia", "broker"].includes(normalized)) return false;
  return null;
}

function extractJsonValue(text, startIndex) {
  if (text[startIndex] !== "{" && text[startIndex] !== "[") {
    return null;
  }

  const closingChar = text[startIndex] === "{" ? "}" : "]";
  const stack = [text[startIndex]];
  let inString = false;
  let escapeNext = false;

  for (let index = startIndex + 1; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === "\\") {
        escapeNext = true;
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

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      const expected = char === "}" ? "{" : "[";
      if (stack[stack.length - 1] !== expected) {
        return null;
      }
      stack.pop();
      if (stack.length === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function extractInitialState(html) {
  if (typeof html !== "string" || !html.trim()) return null;

  const markers = ["__INITIAL_STATE__", "__NEXT_DATA__", "window.__INITIAL_STATE__", "window.__NEXT_DATA__"];
  for (const marker of markers) {
    const index = html.indexOf(marker);
    if (index === -1) continue;
    const assignmentIndex = html.indexOf("=", index);
    if (assignmentIndex === -1) continue;
    const candidate = html.slice(assignmentIndex + 1).trim();
    const firstChar = candidate.charAt(0);
    if (firstChar !== "{" && firstChar !== "[") continue;
    const jsonText = extractJsonValue(candidate, 0);
    if (!jsonText) continue;
    try {
      return JSON.parse(jsonText);
    } catch {
      // fallback next markers
    }
  }

  return null;
}

function extractListingCandidates(node) {
  if (!node || typeof node !== "object") return [];

  const candidates = [];
  const queue = [node];
  const listingKeys = new Set([
    "ads",
    "adList",
    "listings",
    "items",
    "results",
    "properties",
    "searchResults",
    "elementList",
    "list",
    "propertiesList",
    "seoData"
  ]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (Array.isArray(current)) {
      for (const item of current) {
        if (item && typeof item === "object") queue.push(item);
      }
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      if (Array.isArray(value) && value.length > 0 && (listingKeys.has(key) || value.some((item) => item && typeof item === "object" && (item.id || item.propertyCode || item.code || item.url)))) {
        candidates.push(...value.filter((item) => item && typeof item === "object"));
      }
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return candidates;
}

function pickFirstString(...values) {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) return normalized;
  }
  return null;
}

export function normalizeIdealistaListing(item) {
  if (!item || typeof item !== "object") return null;

  const externalId = pickFirstString(item.id, item.propertyCode, item.code, item.listingId, item.adId, item.reference);
  const title = pickFirstString(item.title, item.name, item.address, item.mainText);
  const url = normalizeUrl(getNestedValue(item, ["url", "permalink", "link", "href"])) || (item?.detail?.url ? normalizeUrl(item.detail.url) : null);

  if (!externalId || !url) {
    return null;
  }

  const area = parseArea(getNestedValue(item, ["area", "size", "surface", "m2", "squareMeters", "areaInSquareMeters"]));
  const priceValue = getNestedValue(item, ["price", "priceValue", "priceAmount", "amount", "totalPrice"]);
  const price = parseNumeric(priceValue);
  const rawPrice = Number.isFinite(Number(priceValue)) ? Number(priceValue) : null;

  const location = item.location || item.address || {};
  const city = pickFirstString(location.city, item.city, item.municipality, item.locality);
  const concelho = pickFirstString(location.county, item.county, item.municipality, item.concelho);
  const freguesia = pickFirstString(location.district, item.freguesia, item.neighborhood, location.neighborhood);
  const district = pickFirstString(location.province, item.district, item.region, location.region);

  const ownerSource = item.owner || item.advertiser || item.agent || item.provider || {};
  const ownerName = pickFirstString(ownerSource.name, item.ownerName, item.advertiserName, item.contactName);
  const isPrivateOwner = parseOwnerType(getNestedValue(item, ["isPrivateOwner", "isPrivateOwnerValue", "advertiserType", "ownerType", "sellerType"])) ?? parseOwnerType(ownerSource.type ?? ownerSource.kind ?? ownerSource.category) ?? null;

  return {
    externalId: String(externalId).trim(),
    title: title ? String(title).trim() : null,
    price: Number.isFinite(rawPrice) ? rawPrice : price,
    location: [city, district].filter(Boolean).join(", ") || null,
    url,
    area,
    rooms: parseNumeric(getNestedValue(item, ["rooms", "bedrooms", "bedroomNumber", "roomNumber"])) ?? (item?.rooms !== undefined ? Number(item.rooms) || null : null),
    city: city || null,
    concelho: concelho || null,
    freguesia: freguesia || null,
    district: district || null,
    ownerName: ownerName || null,
    isPrivateOwner: isPrivateOwner,
    shortDescription: pickFirstString(item.summary, item.description, item.shortDescription),
    images: Array.isArray(item.images) ? item.images.map((image) => normalizeUrl(image?.url || image || "")).filter(Boolean) : [],
    publishedAt: parseDate(getNestedValue(item, ["publishedAt", "publishDate", "date", "published_at", "createdAt"])),
    modifiedAt: parseDate(getNestedValue(item, ["modifiedAt", "updatedAt", "updated_at", "lastUpdated", "modified_at"])) || null,
    createdAtFirst: parseDate(getNestedValue(item, ["publishedAt", "publishDate", "date", "published_at", "createdAt"])),
    rawData: item
  };
}

export function parseIdealistaSearchPage(html) {
  const root = extractInitialState(html);
  const candidates = extractListingCandidates(root);

  const listings = candidates
    .map(normalizeIdealistaListing)
    .filter(Boolean);

  const nextUrl = (() => {
    if (typeof html !== "string" || !html.trim()) return null;
    const match = html.match(/<link\b[^>]*rel=["']next["'][^>]*href=["']([^"']+)["'][^>]*>/i);
    if (match) {
      try {
        return new URL(match[1], IDEALISTA_BASE_URL).toString();
      } catch {
        return null;
      }
    }
    return null;
  })();

  return {
    listings,
    nextUrl
  };
}
