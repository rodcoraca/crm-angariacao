import { extractNextData, getLocationPath } from "../../../src/shared/provider-engine/imovirtual/parsers.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 100;
const CONCURRENCY = 10;
const FETCH_TIMEOUT_MS = 15000;

export function getAuthorizedEmpresaIds({ roles, requestedEmpresaId = null }: { roles?: Array<any>; requestedEmpresaId?: string | null }) {
  const allowed = new Set<string>();
  for (const row of Array.isArray(roles) ? roles : []) {
    const code = String(row?.roles?.code ?? row?.role_code ?? "").trim().toUpperCase();
    const empresaId = row?.empresa_id ?? row?.empresaId;
    if (code === "ADMIN" && empresaId) allowed.add(String(empresaId));
  }

  if (!allowed.size) return [];

  const requested = String(requestedEmpresaId ?? "").trim();
  if (!requested) return [...allowed];

  return allowed.has(requested) ? [requested] : [];
}

export function resolveCandidateUrl(row: any) {
  if (!row || typeof row !== "object") return null;

  const rawData = row.raw_data && typeof row.raw_data === "object" ? row.raw_data : {};
  const candidates = [
    row.url,
    rawData.url,
    rawData.href,
    rawData.adUrl,
    rawData.detailUrl,
    rawData.pageUrl,
    rawData.sourceUrl,
    rawData.externalUrl
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
    } catch {
      // Ignore malformed URLs; do not invent one from externalId alone.
    }
  }

  return null;
}

export function buildLocationUpdatePayload(row: any, location: any, updatedAtIso = new Date().toISOString()) {
  const rawData = row.raw_data && typeof row.raw_data === "object" ? row.raw_data : {};
  const city = firstText(location?.city, row?.city);
  const district = firstText(location?.district, row?.district);
  const municipality = firstText(location?.municipality, row?.concelho, row?.municipality);
  const freguesia = firstText(location?.freguesia, row?.freguesia);
  const structuredLocation = [city, municipality, district]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .reduce((parts: string[], part) => {
      const normalized = part.trim();
      if (!normalized || parts.includes(normalized)) return parts;
      parts.push(normalized);
      return parts;
    }, [])
    .join(", ") || null;

  const payload: Record<string, unknown> = {
    updated_at: updatedAtIso,
    raw_data: {
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
          repairedAt: updatedAtIso,
          source: location?.source || "imovirtual"
        }
      }
    }
  };

  if (isInvalidLocation(row.city) && city) payload.city = city;
  if (isInvalidLocation(row.district) && district) payload.district = district;
  if (isInvalidLocation(row.location) && structuredLocation) payload.location = structuredLocation;
  if (isInvalidLocation(row.freguesia) && freguesia) payload.freguesia = freguesia;
  if (isInvalidLocation(row.concelho) && municipality) payload.concelho = municipality;

  return payload;
}

export function classifyFetchOutcome(result: { ok?: boolean; category?: string; status?: number }) {
  if (!result || result.ok) return "ok";
  if (result.category === "http_error") return "http_error";
  if (result.category === "location_not_found") return "location_not_found";
  if (result.category === "missing_url") return "missing_url";
  return "extraction_failed";
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

export function isInvalidLocation(value: unknown) {
  const normalized = String(value || "").trim().toUpperCase();
  return !normalized || normalized === "N/A";
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim() && !isInvalidLocation(value)) {
      return value.trim();
    }
  }
  return null;
}

function findObjectByExternalId(value: unknown, externalId: string, seen = new Set()) {
  const target = String(externalId || "").trim();
  if (!target) return null;
  if (!value || typeof value !== "object") return null;
  if (seen.has(value)) return null;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findObjectByExternalId(entry, target, seen);
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

  if (idCandidates.includes(target)) {
    return object;
  }

  for (const child of Object.values(object)) {
    const found = findObjectByExternalId(child, target, seen);
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

const JSON_LD_ID_KEYS = new Set(["@id", "id", "url", "sku", "productid"]);

function collectJsonLdIdentifiers(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  const object = value as Record<string, unknown>;
  const identifiers: string[] = [];

  for (const key of JSON_LD_ID_KEYS) {
    const candidate = object[key];
    if (typeof candidate === "string" && candidate.trim()) identifiers.push(candidate.trim());
  }

  const identifier = object.identifier;
  if (typeof identifier === "string" && identifier.trim()) {
    identifiers.push(identifier.trim());
  } else if (identifier && typeof identifier === "object" && !Array.isArray(identifier)) {
    const item = identifier as Record<string, unknown>;
    for (const candidate of [item.value, item.id, item["@id"]]) {
      if (typeof candidate === "string" && candidate.trim()) identifiers.push(candidate.trim());
    }
  }

  return identifiers;
}

function jsonLdMatchesAd(object: unknown, externalId: string, pageUrl: string | null) {
  const normalizedId = String(externalId || "").trim().toLowerCase();
  if (!normalizedId) return false;

  let normalizedPageUrl = "";
  try {
    normalizedPageUrl = pageUrl ? new URL(pageUrl).toString().replace(/\/$/, "").toLowerCase() : "";
  } catch {
    normalizedPageUrl = "";
  }

  return collectJsonLdIdentifiers(object).some((value) => {
    const candidate = value.trim().toLowerCase();
    if (candidate === normalizedId) return true;

    try {
      const candidateUrl = new URL(value);
      const candidatePath = candidateUrl.pathname.split("/").filter(Boolean);
      if (candidatePath.some((segment) => segment === normalizedId)) return true;
      return Boolean(normalizedPageUrl) &&
        candidateUrl.toString().replace(/\/$/, "").toLowerCase() === normalizedPageUrl;
    } catch {
      return false;
    }
  });
}

function flattenJsonLdObjects(objects: unknown[]) {
  const flattened: any[] = [];
  for (const object of Array.isArray(objects) ? objects : []) {
    if (!object || typeof object !== "object") continue;
    if (Array.isArray((object as any)["@graph"])) flattened.push(...(object as any)["@graph"]);
    flattened.push(object);
  }
  return flattened;
}

function findJsonLdLocation(objects: unknown[], externalId: string, pageUrl: string | null) {
  for (const object of flattenJsonLdObjects(objects)) {
    if (!jsonLdMatchesAd(object, externalId, pageUrl)) continue;

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
      const municipality = firstText(
        (candidate as any).addressCounty,
        (candidate as any).municipality,
        (candidate as any).county
      );

      if (city || district || municipality) {
        return { city, district, municipality, freguesia: null };
      }
    }
  }

  return null;
}

export function extractLocationFromHtml(html: string, externalId: string, pageUrl: string | null = null) {
  const nextData = extractNextData(html);
  const matched = nextData ? findObjectByExternalId(nextData, externalId) : null;

  if (matched) {
    const locationPath = getLocationPath(matched);
    const location = {
      city: locationPath.city,
      district: locationPath.district,
      municipality: locationPath.municipality,
      freguesia: locationPath.freguesia
    };
    if (location.city || location.district || location.municipality || location.freguesia) {
      return { ok: true, source: "next_data", location };
    }
  }

  const jsonLdLocation = findJsonLdLocation(extractJsonLdObjects(html), externalId, pageUrl);
  if (jsonLdLocation) {
    return { ok: true, source: "json_ld", location: jsonLdLocation };
  }

  return { ok: false, category: "location_not_found", error: "Localizacao nao encontrada no anuncio." };
}

export async function fetchListing(
  url: string,
  externalId: string,
  { fetchImpl, timeoutMs }: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
) {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(String(url || ""));
  } catch {
    return { ok: false, category: "invalid_url", error: "URL inválida." };
  }

  if (parsedUrl.protocol !== "https:") {
    return { ok: false, category: "invalid_url", error: "Apenas URLs HTTPS são permitidas." };
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname !== "imovirtual.com" && !hostname.endsWith(".imovirtual.com")) {
    return { ok: false, category: "invalid_url", error: "Apenas URLs do domínio imovirtual.com são permitidas." };
  }

  const doFetch = typeof fetchImpl === "function" ? fetchImpl : fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs || FETCH_TIMEOUT_MS);

  try {
    const response = await doFetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OSFlow-Imovirtual-Repair/1.0)"
      },
      redirect: "manual",
      signal: controller.signal
    });

    const responseType = String((response as any)?.type || "").toLowerCase();
    const responseStatus = Number((response as any)?.status) || 0;
    if (responseType === "redirect" || responseType === "opaqueredirect" || (responseStatus >= 300 && responseStatus < 400)) {
      const location = String((response as any)?.headers?.get?.("location") || "").trim();
      if (!location) {
        return { ok: false, category: "invalid_redirect", status: responseStatus || undefined, error: "Redirecionamento sem destino." };
      }

      let redirectUrl: URL;
      try {
        redirectUrl = new URL(location, parsedUrl);
      } catch {
        return { ok: false, category: "invalid_redirect", status: responseStatus || undefined, error: "Destino de redirecionamento inválido." };
      }

      const redirectHostname = redirectUrl.hostname.toLowerCase();
      if (redirectUrl.protocol !== "https:" || (redirectHostname !== "imovirtual.com" && !redirectHostname.endsWith(".imovirtual.com"))) {
        return { ok: false, category: "invalid_redirect", status: responseStatus || undefined, error: "Redirecionamento para domínio externo não permitido." };
      }

      const redirectResponse = await doFetch(redirectUrl.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; OSFlow-Imovirtual-Repair/1.0)"
        },
        redirect: "manual",
        signal: controller.signal
      });

      const redirectResponseType = String((redirectResponse as any)?.type || "").toLowerCase();
      const redirectResponseStatus = Number((redirectResponse as any)?.status) || 0;
      if (redirectResponseType === "redirect" || redirectResponseType === "opaqueredirect" || (redirectResponseStatus >= 300 && redirectResponseStatus < 400)) {
        return { ok: false, category: "invalid_redirect", status: redirectResponseStatus || undefined, error: "Múltiplos redirecionamentos não permitidos." };
      }

      if (!redirectResponse.ok) {
        return { ok: false, category: "http_error", status: redirectResponse.status, error: `HTTP ${redirectResponse.status}` };
      }

      const redirectHtml = await redirectResponse.text();
      if (typeof redirectHtml !== "string" || !redirectHtml.trim()) {
        return { ok: false, category: "invalid_response", error: "Resposta vazia ou inválida." };
      }

      return extractLocationFromHtml(redirectHtml, String(externalId || ""), redirectUrl.toString());
    }

    if (!response.ok) {
      return { ok: false, category: "http_error", status: response.status, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    if (typeof html !== "string" || !html.trim()) {
      return { ok: false, category: "invalid_response", error: "Resposta vazia ou inválida." };
    }

    return extractLocationFromHtml(html, String(externalId || ""), parsedUrl.toString());
  } catch (error) {
    return {
      ok: false,
      category: "extraction_failed",
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

const INVALID_LOCATION_OR_FILTER = [
  "location.is.null", "location.eq.", "location.ilike.n/a",
  "city.is.null", "city.eq.", "city.ilike.n/a",
  "district.is.null", "district.eq.", "district.ilike.n/a",
  "freguesia.is.null", "freguesia.eq.", "freguesia.ilike.n/a",
  "concelho.is.null", "concelho.eq.", "concelho.ilike.n/a"
].join(",");

export function buildInvalidLocationFilter() {
  return INVALID_LOCATION_OR_FILTER;
}

export function hasInvalidLocationFields(row: any) {
  return isInvalidLocation(row?.location) ||
    isInvalidLocation(row?.city) ||
    isInvalidLocation(row?.district) ||
    isInvalidLocation(row?.freguesia) ||
    isInvalidLocation(row?.concelho);
}

export function resolveBatchSize(value: unknown) {
  return Math.min(MAX_BATCH_SIZE, Math.max(1, Number(value) || DEFAULT_BATCH_SIZE));
}

export function applyAfterIdFilter(query: any, afterId: unknown) {
  const normalized = String(afterId || "").trim();
  return normalized ? query.gt("id", normalized) : query;
}

const LOCATION_COLUMNS = ["city", "district", "location", "freguesia", "concelho"];

export function createRepairResult() {
  return {
    success: true,
    provider: "imovirtual",
    fetched: 0,
    updated: 0,
    partial: 0,
    notFound: 0,
    httpErrors: 0,
    extractionErrors: 0,
    locationErrors: 0,
    updateErrors: 0,
    errors: [] as Array<{ id: string; externalId: string; error: string; category?: string }>
  };
}

export async function processRepairCandidates(
  rows: any[],
  {
    fetchLocation,
    updateRow,
    markUnavailable
  }: {
    fetchLocation: (url: string, externalId: string) => Promise<any>;
    updateRow: (row: any, payload: Record<string, unknown>) => Promise<string | null>;
    markUnavailable?: (row: any, reason: string) => Promise<void>;
  }
) {
  const result = createRepairResult();
  const candidates = Array.isArray(rows) ? rows : [];
  result.fetched = candidates.length;

  await runConcurrent(candidates, async (row: any) => {
    const candidateUrl = resolveCandidateUrl(row);
    if (!candidateUrl || !row.external_id) {
      result.locationErrors += 1;
      result.errors.push({
        id: row.id,
        externalId: String(row.external_id || ""),
        error: "URL ou external_id ausente ou inválida na base de dados.",
        category: "missing_url"
      });
      return;
    }

    const fetched = await fetchLocation(candidateUrl, String(row.external_id));
    if (!fetched.ok) {
      const classification = classifyFetchOutcome(fetched);
      if (classification === "http_error") result.httpErrors += 1;
      else if (classification === "location_not_found") result.notFound += 1;
      else result.extractionErrors += 1;

      result.errors.push({
        id: row.id,
        externalId: String(row.external_id),
        error: fetched.error || "Falha ao obter localização.",
        category: fetched.category || classification
      });

      // Marcar 404/410 como definitivamente indisponível
      if ((fetched.status === 404 || fetched.status === 410) && markUnavailable) {
        await markUnavailable(row, `HTTP ${fetched.status}`);
      }

      return;
    }

    const location = fetched.location || {};
    if (!location.city && !location.district && !location.freguesia && !location.municipality) {
      result.notFound += 1;
      result.errors.push({
        id: row.id,
        externalId: String(row.external_id),
        error: "Localizacao nao encontrada no anuncio.",
        category: "location_not_found"
      });
      return;
    }

    const payload = buildLocationUpdatePayload(row, { ...location, source: fetched.source }, new Date().toISOString());
    const correctedFields = LOCATION_COLUMNS.filter((column) => payload[column] !== undefined);
    if (!correctedFields.length) {
      result.notFound += 1;
      result.errors.push({
        id: row.id,
        externalId: String(row.external_id),
        error: "Localização recuperada não corrige nenhum campo inválido.",
        category: "location_not_found"
      });
      return;
    }

    const updateError = await updateRow(row, payload);
    if (updateError) {
      result.updateErrors += 1;
      result.errors.push({
        id: row.id,
        externalId: String(row.external_id),
        error: updateError,
        category: "update_failed"
      });
      return;
    }

    const remainingInvalid = LOCATION_COLUMNS.filter(
      (column) => isInvalidLocation(row[column]) && payload[column] === undefined
    );
    if (remainingInvalid.length) {
      result.partial += 1;
    } else {
      result.updated += 1;
    }
  });

  return result;
}

if (typeof Deno !== "undefined" && Deno.serve) {
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

    const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return jsonResponse(401, { success: false, message: "Authorization obrigatório." });

    const { createClient } = await import("npm:@supabase/supabase-js");
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await request.json().catch(() => ({}));

    // Aceitar service_role key diretamente (para chamadas internas do scheduler)
    const isServiceRole = token === serviceRoleKey;
    let validEmpresaIds: string[] = [];

    if (isServiceRole) {
      // Service role tem acesso a todas as empresas
      const { data: empresas, error: empresasError } = await supabaseAdmin
        .from("empresas")
        .select("id");

      if (empresasError || !empresas?.length) {
        return jsonResponse(500, { success: false, message: "Erro ao obter empresas." });
      }

      validEmpresaIds = empresas.map((e: any) => String(e.id));
    } else {
      // Validar JWT de utilizador ADMIN
      const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(token);
      if (callerError || !callerData?.user) {
        return jsonResponse(401, { success: false, message: "Token inválido." });
      }

      const { data: roles, error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .select("empresa_id,roles(code)")
        .eq("user_id", callerData.user.id);

      const adminRoles = Array.isArray(roles) ? roles : [];
      const isAdmin = !rolesError && adminRoles.some((row: any) =>
        String(row?.roles?.code || "").trim().toUpperCase() === "ADMIN"
      );

      if (!isAdmin) {
        return jsonResponse(403, { success: false, message: "Apenas utilizadores ADMIN podem executar este repair." });
      }

      const requestedEmpresaId = String(body?.empresa_id || body?.empresaId || "").trim() || null;
      validEmpresaIds = getAuthorizedEmpresaIds({ roles: adminRoles, requestedEmpresaId });
      if (!validEmpresaIds.length) {
        return jsonResponse(403, { success: false, message: "Empresa não autorizada para este utilizador." });
      }
    }

    const batchSize = resolveBatchSize(body?.batchSize);
    const afterId = String(body?.afterId || "").trim();

    let query = supabaseAdmin
      .from("provider_leads")
      .select("id,external_id,url,location,city,district,freguesia,concelho,empresa_id,raw_data")
      .eq("provider", "imovirtual")
      .in("empresa_id", validEmpresaIds)
      .or(buildInvalidLocationFilter())
      .order("id", { ascending: true })
      .limit(batchSize);

    query = applyAfterIdFilter(query, afterId);

    const { data: rows, error: queryError } = await query;
    if (queryError) {
      return jsonResponse(500, { success: false, message: queryError.message });
    }

    const candidates = (rows || []).filter((row: any) => {
      // Excluir anúncios marcados como permanentemente indisponíveis
      const repairInfo = row.raw_data?.repair?.imovirtualLocation;
      if (repairInfo?.permanent === true) return false;

      return hasInvalidLocationFields(row);
    });

    const outcome = await processRepairCandidates(candidates, {
      fetchLocation: (url, externalId) => fetchListing(url, externalId),
      updateRow: async (row, payload) => {
        const { data: updatedRows, error: updateError } = await supabaseAdmin
          .from("provider_leads")
          .update(payload)
          .eq("id", row.id)
          .eq("external_id", row.external_id)
          .eq("provider", "imovirtual")
          .in("empresa_id", validEmpresaIds)
          .select("id");

        if (updateError) return updateError.message;
        if (!updatedRows?.length) return "Nenhum registo foi atualizado.";
        return null;
      },
      markUnavailable: async (row, reason) => {
        const { error: markError } = await supabaseAdmin
          .from("provider_leads")
          .update({
            raw_data: {
              ...(row.raw_data && typeof row.raw_data === "object" ? row.raw_data : {}),
              repair: {
                ...(row.raw_data?.repair && typeof row.raw_data.repair === "object" ? row.raw_data.repair : {}),
                imovirtualLocation: {
                  ...(row.raw_data?.repair?.imovirtualLocation &&
                    typeof row.raw_data.repair.imovirtualLocation === "object"
                    ? row.raw_data.repair.imovirtualLocation
                    : {}),
                  unavailableAt: new Date().toISOString(),
                  reason,
                  permanent: true
                }
              }
            }
          })
          .eq("id", row.id);

        if (markError) {
          console.error(`[Repair] Erro ao marcar ${row.id} como indisponível:`, markError);
        }
      }
    });

    return jsonResponse(200, {
      ...outcome,
      lastId: rows?.length ? rows[rows.length - 1].id : null,
      hasMore: rows?.length === batchSize
    });
  });
}
