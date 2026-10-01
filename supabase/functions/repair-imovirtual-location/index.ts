import { createClient } from "npm:@supabase/supabase-js";
import { extractNextData } from "../../../src/shared/provider-engine/imovirtual/parsers.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 100;
const CONCURRENCY = 10;
const FETCH_TIMEOUT_MS = 15000;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function isInvalidLocation(value: unknown) {
  const normalized = String(value || "").trim().toUpperCase();
  return !normalized || normalized === "N/A";
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function getLocationPath(item: any) {
  const location = item?.location || {};
  const address = location?.address || {};

  const district = firstText(
    address?.province?.name,
    location?.province?.name,
    item?.province?.name,
    item?.province,
    item?.district,
    item?.region
  );

  const municipality = firstText(
    address?.county?.name,
    location?.county?.name,
    item?.county?.name,
    item?.county,
    item?.municipality?.name,
    item?.municipality,
    item?.concelho?.name,
    item?.concelho
  );

  const city = firstText(
    address?.city?.name,
    location?.city?.name,
    item?.city?.name,
    item?.city
  );

  const freguesia = firstText(
    address?.parish?.name,
    address?.freguesia?.name,
    location?.parish?.name,
    location?.freguesia?.name,
    item?.parish?.name,
    item?.parish,
    item?.freguesia?.name,
    item?.freguesia
  );

  return {
    city,
    district,
    municipality,
    freguesia
  };
}

function findObjectByExternalId(value: unknown, externalId: string, seen = new Set()) {
  if (!value || typeof value !== "object") return null;
  if (seen.has(value)) return null;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findObjectByExternalId(entry, externalId, seen);
      if (found) return found;
    }
    return null;
  }

  const object = value as Record<string, unknown>;
  const idCandidates = [
    object.id,
    object.externalId,
    object.external_id,
    object.adId,
    object.advertId
  ].map((candidate) => String(candidate ?? "").trim());

  if (idCandidates.includes(externalId)) {
    return object;
  }

  for (const child of Object.values(object)) {
    const found = findObjectByExternalId(child, externalId, seen);
    if (found) return found;
  }

  return null;
}

function extractJsonLdObjects(html: string) {
  const objects: unknown[] = [];
  const opening = "<script";
  const closing = "</script>";

  let cursor = 0;
  while (cursor < html.length) {
    const scriptStart = html.indexOf(opening, cursor);
    if (scriptStart < 0) break;

    const scriptEnd = html.indexOf(closing, scriptStart);
    if (scriptEnd < 0) break;

    const tagEnd = html.indexOf(">", scriptStart);
    if (tagEnd < 0 || tagEnd > scriptEnd) {
      cursor = scriptEnd + closing.length;
      continue;
    }

    const tag = html.slice(scriptStart, tagEnd + 1);
    if (/type=["']application\/ld\+json["']/i.test(tag)) {
      const body = html.slice(tagEnd + 1, scriptEnd);
      try {
        const parsed = JSON.parse(body);
        if (Array.isArray(parsed)) objects.push(...parsed);
        else objects.push(parsed);
      } catch {
        // Ignore malformed JSON-LD blocks.
      }
    }

    cursor = scriptEnd + closing.length;
  }

  return objects;
}

function findJsonLdLocation(objects: unknown[]) {
  for (const object of objects) {
    const candidates = [object, (object as any)?.address, (object as any)?.itemOffered?.address];
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== "object") continue;

      const city = firstText(
        (candidate as any).addressLocality,
        (candidate as any).city
      );
      const district = firstText(
        (candidate as any).addressRegion,
        (candidate as any).region
      );

      if (city || district) {
        return { city, district, municipality: null, freguesia: null };
      }
    }
  }

  return null;
}

async function fetchListing(url: string, externalId: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OSFlow-Imovirtual-Repair/1.0)"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const nextData = extractNextData(html);
    const matched = findObjectByExternalId(nextData, externalId);

    if (matched) {
      const location = getLocationPath(matched);
      if (location.city || location.district || location.municipality || location.freguesia) {
        return { ok: true, source: "next_data", location };
      }
    }

    const jsonLdLocation = findJsonLdLocation(extractJsonLdObjects(html));
    if (jsonLdLocation) {
      return { ok: true, source: "json_ld", location: jsonLdLocation };
    }

    const htmlSignals = {
      htmlLength: html.length,
      hasNextData: html.includes("__NEXT_DATA__"),
      hasExternalId: html.includes(externalId),
      hasProvince: /province|distrito/i.test(html),
      hasCounty: /county|concelho|município|municipio/i.test(html),
      hasCity: /city|cidade/i.test(html),
      hasParish: /parish|freguesia/i.test(html),
      matched: !!matched,
      matchedKeys: matched && typeof matched === "object" ? Object.keys(matched).slice(0, 80) : [],
      matchedLocation: matched && typeof matched === "object" ? (matched as any).location ?? null : null,
      matchedProvince: matched && typeof matched === "object" ? (matched as any).province ?? null : null,
      matchedCounty: matched && typeof matched === "object" ? (matched as any).county ?? null : null,
      matchedCity: matched && typeof matched === "object" ? (matched as any).city ?? null : null,
      matchedParish: matched && typeof matched === "object"
        ? ((matched as any).parish ?? (matched as any).freguesia ?? null)
        : null
    };

    return {
      ok: false,
      error: "Localizacao nao encontrada no anuncio.",
      diagnostics: htmlSignals
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runConcurrent<T>(items: T[], worker: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(CONCURRENCY, queue.length) },
    async () => {
      while (queue.length) {
        const item = queue.shift();
        if (item === undefined) break;
        await worker(item);
      }
    }
  );

  await Promise.all(workers);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") {
    return jsonResponse(405, { success: false, message: "POST obrigatório." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { success: false, message: "Supabase não configurado." });
  }

  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\\s+/i, "").trim();
  if (!token) return jsonResponse(401, { success: false, message: "Authorization obrigatório." });

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(token);
  if (callerError || !callerData?.user) {
    return jsonResponse(401, { success: false, message: "Token inválido." });
  }

  const { data: roles, error: rolesError } = await supabaseAdmin
    .from("user_roles")
    .select("empresa_id,roles(code)")
    .eq("user_id", callerData.user.id);

  const isAdmin = !rolesError && (roles || []).some((row: any) =>
    String(row?.roles?.code || "").trim().toUpperCase() === "ADMIN"
  );

  if (!isAdmin) {
    return jsonResponse(403, { success: false, message: "Apenas utilizadores ADMIN podem executar este repair." });
  }

  const body = await request.json().catch(() => ({}));
  const batchSize = Math.min(
    MAX_BATCH_SIZE,
    Math.max(1, Number(body?.batchSize) || DEFAULT_BATCH_SIZE)
  );
  const afterId = String(body?.afterId || "").trim();

  let query = supabaseAdmin
    .from("provider_leads")
    .select("id,external_id,url,location,city,district,freguesia,concelho,raw_data")
    .eq("provider", "imovirtual")
    .or("location.is.null,location.eq.,city.is.null,city.eq.,district.is.null,district.eq.")
    .order("id", { ascending: true })
    .limit(batchSize);

  if (afterId) query = query.gt("id", afterId);

  const { data: rows, error: queryError } = await query;
  if (queryError) {
    return jsonResponse(500, { success: false, message: queryError.message });
  }

  const candidates = (rows || []).filter((row: any) =>
    isInvalidLocation(row.location) ||
    isInvalidLocation(row.city) ||
    isInvalidLocation(row.district)
  );

  const result = {
    success: true,
    provider: "imovirtual",
    fetched: candidates.length,
    updated: 0,
    notFound: 0,
    errors: [] as Array<{ id: string; externalId: string; error: string }>,
    lastId: rows?.length ? rows[rows.length - 1].id : null,
    hasMore: rows?.length === batchSize
  };

  await runConcurrent(candidates, async (row: any) => {
    if (!row.url || !row.external_id) {
      result.errors.push({
        id: row.id,
        externalId: String(row.external_id || ""),
        error: "URL ou external_id ausente."
      });
      return;
    }

    const fetched = await fetchListing(row.url, String(row.external_id));
    if (!fetched.ok) {
      result.notFound += 1;
      result.errors.push({
        id: row.id,
        externalId: String(row.external_id),
        error: fetched.error || "Falha ao obter localização.",
        ...(fetched.diagnostics ? { diagnostics: fetched.diagnostics } : {})
      });
      return;
    }

    const location = fetched.location;
    const city = location.city || null;
    const district = location.district || null;
    const freguesia = location.freguesia || null;
    const municipality = location.municipality || null;
    const structuredLocation = [city, district].filter(Boolean).join(", ") || null;

    if (!city && !district && !freguesia && !municipality) {
      result.notFound += 1;
      return;
    }

    const rawData = row.raw_data && typeof row.raw_data === "object"
      ? row.raw_data
      : {};

    const mergedRawData = {
      ...rawData,
      city: city || rawData.city || null,
      district: district || rawData.district || null,
      municipality: municipality || rawData.municipality || null,
      freguesia: freguesia || rawData.freguesia || null,
      location: {
        ...(rawData.location && typeof rawData.location === "object" ? rawData.location : {}),
        city: city || rawData?.location?.city || null,
        district: district || rawData?.location?.district || null,
        municipality: municipality || rawData?.location?.municipality || null,
        freguesia: freguesia || rawData?.location?.freguesia || null
      },
      repair: {
        ...(rawData.repair && typeof rawData.repair === "object" ? rawData.repair : {}),
        imovirtualLocation: {
          repairedAt: new Date().toISOString(),
          source: fetched.source
        }
      }
    };

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      raw_data: mergedRawData
    };

    if (isInvalidLocation(row.city) && city) payload.city = city;
    if (isInvalidLocation(row.district) && district) payload.district = district;
    if (isInvalidLocation(row.location) && structuredLocation) payload.location = structuredLocation;
    if (isInvalidLocation(row.freguesia) && freguesia) payload.freguesia = freguesia;
    if (isInvalidLocation(row.concelho) && municipality) payload.concelho = municipality;

    const { error: updateError } = await supabaseAdmin
      .from("provider_leads")
      .update(payload)
      .eq("id", row.id)
      .eq("provider", "imovirtual");

    if (updateError) {
      result.errors.push({
        id: row.id,
        externalId: String(row.external_id),
        error: updateError.message
      });
      return;
    }

    result.updated += 1;
  });

  return jsonResponse(200, result);
});
