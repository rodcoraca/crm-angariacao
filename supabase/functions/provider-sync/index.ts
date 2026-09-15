import { createClient } from "npm:@supabase/supabase-js";
import {
  fetchImovirtualSearchPage,
  collectImovirtualPaginatedListings,
  executeProviderSync,
  warnMissingEmpresaId
} from "../../../src/shared/provider-engine/index.js";
import { collectCustoJustoPaginatedListings } from "../../../src/shared/provider-engine/custojusto/collectPaginatedListings.js";
import { collectIdealistaPaginatedListings } from "../../../src/shared/provider-engine/idealista/collectPaginatedListings.js";
import {
  createOlxCollectionSession,
  collectOlxRoundRobinPaginatedListings,
  discoverOlxCategoriesForSync,
  getOlxCollectionSessionStatus
} from "../../../src/shared/provider-engine/olx/providerAdapter.js";
import { ProviderSearchBuilder } from "../../../src/providers/search/ProviderSearchBuilder.js";
import "../../../src/providers/search/ImovirtualSearchBuilder.js";
import "../../../src/providers/search/CustoJustoSearchBuilder.js";
import "../../../src/providers/search/IdealistaSearchBuilder.js";
import "../../../src/providers/search/OlxSearchBuilder.js";
import { ProviderJobService } from "../_shared/ProviderJobService.ts";
import {
  acquireProviderLock,
  createLockOwnerId,
  parseLockOwnerMarker,
  releaseProviderLock
} from "./lockOwner.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const FALLBACK_MESSAGE = "Provider Sync indisponível.";
const MAX_PAGES = 20;
const STALE_LOCK_WINDOW_MS = 4 * 60 * 1000;
const SYNC_INTERVAL_MINUTES = 240;

function resolveMaxPages(rawValue: unknown): { ok: true; value: number } | { ok: false; message: string } {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return { ok: true, value: MAX_PAGES };
  }

  const numericValue = Number(rawValue);
  if (!Number.isInteger(numericValue)) {
    return { ok: false, message: `maxPages deve ser um inteiro entre 1 e ${MAX_PAGES}.` };
  }

  if (numericValue < 1 || numericValue > MAX_PAGES) {
    return { ok: false, message: `maxPages deve ser um inteiro entre 1 e ${MAX_PAGES}.` };
  }

  return { ok: true, value: numericValue };
}

function getCategoryLabel(searchUrl: string) {
  const pathParts = new URL(searchUrl).pathname.split("/").filter(Boolean);
  const category = pathParts[pathParts.length - 1] || "categoria";
  return category.toUpperCase();
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function fallbackResponse(reason?: string) {
  if (reason) {
    console.error("[provider-sync] fallback", { reason });
  }

  return jsonResponse(200, {
    success: false,
    fallback: true,
    message: FALLBACK_MESSAGE
  });
}

function toDateOrNull(value: unknown) {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function computeNextExecution(success: boolean, now = new Date()) {
  if (!success) return now.toISOString();
  return new Date(now.getTime() + SYNC_INTERVAL_MINUTES * 60 * 1000).toISOString();
}

function hasRadarPermission(permissoes: unknown) {
  if (!permissoes || typeof permissoes !== "object") return false;
  const permissions = permissoes as Record<string, unknown>;
  return permissions["radar.view"] === true || permissions.radar === true;
}

async function loadRegistryRow(
  supabaseAdmin: ReturnType<typeof createClient>,
  empresaId: string,
  provider: string
) {
  const { data, error } = await supabaseAdmin
    .from("provider_registry")
    .select("provider_code,sync_running,last_execution,next_execution,last_error")
    .eq("empresa_id", empresaId)
    .eq("provider_code", provider)
    .maybeSingle();

  return { data, error };
}

async function lockProvider(
  supabaseAdmin: ReturnType<typeof createClient>,
  empresaId: string,
  provider: string,
  ownerId: string
) {
  const nowIso = new Date().toISOString();

  const { data, error } = await acquireProviderLock(supabaseAdmin, {
    empresaId,
    provider,
    ownerId,
    nowIso
  });

  if (error) {
    console.error("[LOCK] lock_failed", {
      provider,
      error: error.message,
      timestamp: nowIso
    });
    return { ok: false, error };
  }

  if (!data) {
    console.log("[LOCK] lock_not_acquired", {
      provider,
      reason: "already_running",
      timestamp: nowIso
    });
    return { ok: false, error: new Error("Provider já está em execução.") };
  }

  console.log("[LOCK] lock_acquired", {
    provider,
    ownerId,
    timestamp: nowIso
  });

  return { ok: true, ownerId };
}

async function unlockProvider({
  supabaseAdmin,
  empresaId,
  provider,
  ownerId,
  success,
  errorMessage
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  empresaId: string;
  provider: string;
  ownerId: string;
  success: boolean;
  errorMessage?: string | null;
}) {
  const now = new Date();
  const nowIso = now.toISOString();
  const nextExecutionIso = computeNextExecution(success, now);

  const { data, error } = await releaseProviderLock(supabaseAdmin, {
    empresaId,
    provider,
    ownerId,
    nextExecutionIso,
    success,
    errorMessage,
    nowIso
  });

  if (error) {
    console.error("[UNLOCK] unlock_failed", {
      provider,
      success,
      error: error.message,
      timestamp: nowIso
    });
    return { owned: false, error };
  }

  if (!data) {
    console.warn("[UNLOCK] fencing_lost", {
      provider,
      ownerId,
      timestamp: nowIso
    });
    return { owned: false, error: null };
  }

  console.log("[UNLOCK] unlock_applied", {
    provider,
    success,
    nextExecution: nextExecutionIso,
    timestamp: nowIso
  });

  return { owned: true, error: null };
}

async function unlockStaleLockIfNeeded(
  supabaseAdmin: ReturnType<typeof createClient>,
  empresaId: string,
  provider: string
) {
  console.log("[provider-sync] STEP_START", {
    step: "loadRegistryRow",
    provider,
    empresaId
  });
  const { data: registryRow, error } = await loadRegistryRow(supabaseAdmin, empresaId, provider);
  console.log("[provider-sync] STEP_END", {
    step: "loadRegistryRow",
    provider,
    empresaId,
    ok: !error,
    found: Boolean(registryRow),
    error: error?.message || null
  });

  if (error) {
    console.error("[LOCK] watchdog_read_failed", {
      provider,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return { ok: false, blocked: true, reason: "watchdog_read_failed" };
  }

  if (!registryRow) {
    console.error("[LOCK] registry_row_missing", {
      provider,
      timestamp: new Date().toISOString()
    });
    return { ok: false, blocked: true, reason: "registry_row_missing" };
  }

  if (!registryRow.sync_running) {
    return { ok: true, blocked: false };
  }

  const ownerId = parseLockOwnerMarker(registryRow.last_error);
  if (!ownerId) {
    console.error("[LOCK] owner_marker_missing", {
      provider,
      timestamp: new Date().toISOString()
    });
    return { ok: true, blocked: true, reason: "owner_marker_missing" };
  }

  const nowMs = Date.now();
  const lastExecution = toDateOrNull(registryRow.last_execution);
  const lockAgeMs = lastExecution ? nowMs - lastExecution.getTime() : 0;
  const job = await ProviderJobService.getJob(supabaseAdmin, ownerId);
  const jobMatchesLock = Boolean(
    job &&
    String(job.id) === ownerId &&
    String(job.empresa_id) === empresaId &&
    String(job.provider) === provider
  );
  const jobUpdatedAt = toDateOrNull(job?.updated_at);
  const jobIsStale = Boolean(
    jobMatchesLock &&
    job?.status === "running" &&
    !job?.finished_at &&
    jobUpdatedAt &&
    nowMs - jobUpdatedAt.getTime() > STALE_LOCK_WINDOW_MS
  );
  const jobAlreadyFinalized = Boolean(
    jobMatchesLock &&
    ["completed", "failed", "cancelled"].includes(String(job?.status)) &&
    job?.finished_at &&
    lockAgeMs > STALE_LOCK_WINDOW_MS
  );
  const preJobOrphanIsStale = !job && Boolean(lastExecution) && lockAgeMs > STALE_LOCK_WINDOW_MS;

  if (!jobIsStale && !jobAlreadyFinalized && !preJobOrphanIsStale) {
    console.log("[LOCK] running_active", {
      provider,
      ownerId,
      lastExecution: registryRow.last_execution || null,
      timestamp: new Date().toISOString()
    });
    return { ok: true, blocked: true, reason: "already_running" };
  }

  console.log("[UNLOCK] watchdog_triggered", {
    provider,
    ownerId,
    jobId: job?.id || null,
    lastExecution: registryRow.last_execution || null,
    timestamp: new Date().toISOString()
  });

  if (jobIsStale) {
    const failed = await ProviderJobService.failJob(
      supabaseAdmin,
      ownerId,
      "Watchdog marcou job órfão após ausência de progresso."
    );

    if (!failed) {
      const currentJob = await ProviderJobService.getJob(supabaseAdmin, ownerId);
      if (!currentJob || currentJob.status === "running") {
        console.error("[LOCK] stale_job_recovery_failed", { provider, ownerId });
        return { ok: false, blocked: true, reason: "stale_job_recovery_failed" };
      }
    }
  }

  const unlockResult = await unlockProvider({
    supabaseAdmin,
    empresaId,
    provider,
    ownerId,
    success: false,
    errorMessage: "Watchdog desbloqueou lock órfão"
  });

  if (!unlockResult.owned) {
    console.warn("[UNLOCK] watchdog_fencing_lost", { provider, ownerId });
  }

  return { ok: true, blocked: false, watchdogUnlocked: unlockResult.owned };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, {
      success: false,
      fallback: true,
      message: FALLBACK_MESSAGE
    });
  }

  try {
    const syncStartedAtMs = Date.now();
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const provider = String(body?.provider || "imovirtual").trim().toLowerCase();
    const empresaId = String(body?.empresaId || "").trim();
    const districts = Array.isArray(body?.districts) ? (body.districts as string[]) : [];
    const tipologia = body?.tipologia !== undefined && body?.tipologia !== null ? String(body.tipologia).trim() : "";
    const minPrice = body?.minPrice !== undefined && body?.minPrice !== null && String(body.minPrice).trim() !== "" ? Number(body.minPrice) : undefined;
    const maxPrice = body?.maxPrice !== undefined && body?.maxPrice !== null && String(body.maxPrice).trim() !== "" ? Number(body.maxPrice) : undefined;
    const includePrivateOwners = body?.includePrivateOwners !== false;
    const includeProfessionalOwners = body?.includeProfessionalOwners !== false;
    const maxPagesValidation = resolveMaxPages(body?.maxPages);
    if (!maxPagesValidation.ok) {
      return jsonResponse(400, {
        success: false,
        fallback: true,
        message: maxPagesValidation.message
      });
    }
    const effectiveMaxPages = maxPagesValidation.value;
    const ownerId = createLockOwnerId();
    let lockAcquired = false;
    let syncSucceeded = false;
    let syncErrorMessage: string | null = null;
    let syncUnlockAttempted = false;

    const releaseProviderLock = async () => {
      if (!lockAcquired || syncUnlockAttempted) {
        return;
      }

      syncUnlockAttempted = true;
      try {
        await unlockProvider({
          supabaseAdmin,
          empresaId,
          provider,
          ownerId,
          success: syncSucceeded,
          errorMessage: syncErrorMessage
        });
      } catch (unlockError) {
        console.error("[UNLOCK] finally_error", {
          provider,
          error: unlockError instanceof Error ? unlockError.message : String(unlockError),
          timestamp: new Date().toISOString()
        });
      }
    };

    console.log("[SYNC] request_received", {
      provider,
      empresaId: empresaId || null,
      timestamp: new Date().toISOString()
    });

    if (provider !== "imovirtual" && provider !== "custojusto" && provider !== "idealista" && provider !== "olx") {
      return jsonResponse(400, {
        success: false,
        fallback: true,
        message: FALLBACK_MESSAGE
      });
    }

    if (!empresaId) {
      warnMissingEmpresaId();
      return fallbackResponse("Operacao sem empresa_id");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return fallbackResponse("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const authorization = request.headers.get("Authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return jsonResponse(401, {
        success: false,
        fallback: true,
        message: "Authorization Bearer token obrigatório."
      });
    }

    console.log("[provider-sync] STEP_START", {
      step: "auth.getUser",
      provider,
      empresaId
    });
    const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(token);
    console.log("[provider-sync] STEP_END", {
      step: "auth.getUser",
      provider,
      empresaId,
      ok: !callerError && Boolean(callerData?.user),
      error: callerError?.message || null
    });
    if (callerError || !callerData?.user) {
      return jsonResponse(401, {
        success: false,
        fallback: true,
        message: "Token inválido."
      });
    }

    console.log("[provider-sync] STEP_START", {
      step: "usuarios.query",
      provider,
      empresaId
    });
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from("usuarios")
      .select("empresa_id,ativo,account_status,permissoes")
      .eq("auth_user_id", callerData.user.id)
      .maybeSingle();
    console.log("[provider-sync] STEP_END", {
      step: "usuarios.query",
      provider,
      empresaId,
      ok: !callerProfileError && Boolean(callerProfile),
      error: callerProfileError?.message || null
    });

    if (
      callerProfileError ||
      !callerProfile ||
      callerProfile.ativo === false ||
      ["disabled", "inactive"].includes(String(callerProfile.account_status || "").trim().toLowerCase())
    ) {
      return jsonResponse(403, {
        success: false,
        fallback: true,
        message: "Perfil não autorizado."
      });
    }

    console.log("[provider-sync] STEP_START", {
      step: "user_roles.query",
      provider,
      empresaId
    });
    const { data: callerRoles, error: callerRolesError } = await supabaseAdmin
      .from("user_roles")
      .select("empresa_id,is_primary,roles(code)")
      .eq("user_id", callerData.user.id)
      .eq("is_primary", true);
    console.log("[provider-sync] STEP_END", {
      step: "user_roles.query",
      provider,
      empresaId,
      ok: !callerRolesError,
      error: callerRolesError?.message || null
    });

    if (callerRolesError) {
      return jsonResponse(403, {
        success: false,
        fallback: true,
        message: "Perfil sem autorização RBAC válida."
      });
    }

    const hasGlobalAdminRole = (callerRoles || []).some((role) =>
      role?.roles?.code &&
      String(role.roles.code).trim().toUpperCase() === "ADMIN" &&
      !role.empresa_id
    );
    const hasCompanyAdminRole = (callerRoles || []).some((role) =>
      role?.roles?.code &&
      String(role.roles.code).trim().toUpperCase() === "ADMIN" &&
      String(role.empresa_id || "") === empresaId
    );
    const hasOwnTenantPermission = (hasRadarPermission(callerProfile.permissoes) || hasCompanyAdminRole) &&
      String(callerProfile.empresa_id || "") === empresaId;

    if (!hasGlobalAdminRole && !hasOwnTenantPermission) {
      return jsonResponse(403, {
        success: false,
        fallback: true,
        message: "Empresa não autorizada."
      });
    }

    if (hasGlobalAdminRole) {
      console.log("[provider-sync] STEP_START", {
        step: "empresas.query",
        provider,
        empresaId
      });
      const { data: targetEmpresa, error: targetEmpresaError } = await supabaseAdmin
        .from("empresas")
        .select("id")
        .eq("id", empresaId)
        .maybeSingle();
      console.log("[provider-sync] STEP_END", {
        step: "empresas.query",
        provider,
        empresaId,
        ok: !targetEmpresaError && Boolean(targetEmpresa),
        error: targetEmpresaError?.message || null
      });

      if (targetEmpresaError || !targetEmpresa) {
        return jsonResponse(403, {
          success: false,
          fallback: true,
          message: "Empresa não autorizada."
        });
      }
    }

    console.log("[provider-sync] STEP_START", {
      step: "loadRegistryRow.watchdog",
      provider,
      empresaId
    });
    const watchdog = await unlockStaleLockIfNeeded(supabaseAdmin, empresaId, provider);
    console.log("[provider-sync] STEP_END", {
      step: "loadRegistryRow.watchdog",
      provider,
      empresaId,
      ok: watchdog.ok,
      blocked: watchdog.blocked,
      reason: watchdog.reason || null
    });
    if (!watchdog.ok) {
      return fallbackResponse(`Watchdog falhou: ${watchdog.reason || "erro desconhecido"}`);
    }

    if (watchdog.blocked) {
      return fallbackResponse("Sincronização já em execução.");
    }

    console.log("[provider-sync] STEP_START", {
      step: "provider_registry.previous_read",
      provider,
      empresaId
    });
    const previousRegistryRow = await loadRegistryRow(supabaseAdmin, empresaId, provider);
    console.log("[provider-sync] STEP_END", {
      step: "provider_registry.previous_read",
      provider,
      empresaId,
      ok: !previousRegistryRow.error,
      found: Boolean(previousRegistryRow.data),
      error: previousRegistryRow.error?.message || null
    });
    const previousLastExecution = toDateOrNull(previousRegistryRow?.data?.last_execution);
    const checkpoint = previousLastExecution ? previousLastExecution.getTime() - (5 * 60 * 1000) : null;

    console.log("[provider-sync] STEP_START", {
      step: "lockProvider",
      provider,
      empresaId
    });
    const lockResult = await lockProvider(supabaseAdmin, empresaId, provider, ownerId);
    console.log("[provider-sync] STEP_END", {
      step: "lockProvider",
      provider,
      empresaId,
      ok: lockResult.ok,
      error: "error" in lockResult ? lockResult.error?.message || null : null
    });
    if (!lockResult.ok) {
      return fallbackResponse("Falha ao adquirir lock de sincronização.");
    }
    lockAcquired = true;
    const olxCollectionSession = provider === "olx" ? createOlxCollectionSession() : null;
    let jobId: string | null = null;
    let executionStatus = "completed";

    try {
      jobId = await ProviderJobService.createJob(supabaseAdmin, { provider, empresaId, jobId: ownerId });
      if (!jobId) {
        throw new Error("Não foi possível criar o job da sincronização.");
      }
      const aggregatedResult = {
        provider,
        empresaId,
        discovered: 0,
        privateOwners: 0,
        analyzedPrivateOwners: 0,
        analyzedAgencies: 0,
        filteredByWindow: 0,
        created: 0,
        skipped: 0,
        errors: [] as Array<{ category: string; externalId: string; error: string }>,
        categories: [] as Array<{ category: string; analyzed: number; created: number; skipped: number }>
      };

      console.log("[DEBUG CONFIG]", {
        provider,
        districts,
        includePrivateOwners,
        includeProfessionalOwners,
        effectiveMaxPages
      });

      let searchUrls;
      if (provider === "olx") {
        const discovery = await discoverOlxCategoriesForSync({ fetchImpl: globalThis.fetch });
        searchUrls = ProviderSearchBuilder.build(provider, {
          categories: discovery.categories
        });
        console.log("[OLX][DISCOVERY] categories", {
          categoriesFound: discovery.metrics.categoriesFound,
          fetchedAt: discovery.fetchedAt
        });
      } else {
        searchUrls = ProviderSearchBuilder.build(provider, {
          districts,
          tipologia,
          minPrice,
          maxPrice,
          includePrivateOwners,
          includeProfessionalOwners
        });
      }

      console.log("[DEBUG URLS]", searchUrls);

      let olxRoundRobinCategories = null;
      if (provider === "olx") {
        const resolveExistingOlxListings = async (externalIds: string[]) => {
          const { data, error } = await supabaseAdmin
            .from("empresa_provider_listings")
            .select("provider_lead_id, provider_leads!inner(external_id, provider)")
            .eq("empresa_id", empresaId)
            .eq("is_active", true)
            .eq("provider_leads.provider", "olx")
            .in("provider_leads.external_id", externalIds);

          if (error) throw error;

          const existing = new Map<string, string>();
          for (const row of data || []) {
            const providerLead = Array.isArray(row.provider_leads)
              ? row.provider_leads[0]
              : row.provider_leads;
            if (providerLead?.external_id && row.provider_lead_id) {
              existing.set(String(providerLead.external_id), String(row.provider_lead_id));
            }
          }
          return existing;
        };

        const roundRobinResult = await collectOlxRoundRobinPaginatedListings({
          searchUrls,
          maxPages: effectiveMaxPages,
          districts,
          collectionSession: olxCollectionSession,
          resolveExistingListings: resolveExistingOlxListings
        });
        olxRoundRobinCategories = roundRobinResult.categories;
      }

      for (const [searchIndex, searchUrl] of searchUrls.entries()) {
        const categoryLabel = getCategoryLabel(searchUrl);

        let paginated;
        try {
          if (provider === "imovirtual") {
            paginated = await collectImovirtualPaginatedListings({
              maxPages: effectiveMaxPages,
              checkpoint,
              fetchPage: (page: number) => {
                return fetchImovirtualSearchPage({
                  searchUrl,
                  page,
                  fetchImpl: globalThis.fetch
                });
              }
            });
          } else if (provider === "custojusto") {
            paginated = await collectCustoJustoPaginatedListings(searchUrl, {
              maxPages: effectiveMaxPages
            });
          } else if (provider === "idealista") {
            paginated = await collectIdealistaPaginatedListings(searchUrl, {
              maxPages: effectiveMaxPages,
              includePrivateOwners,
              includeProfessionalOwners
            });
          } else if (provider === "olx") {
            const categoryResult = olxRoundRobinCategories?.[searchIndex];
            paginated = {
              ...categoryResult,
              listings: categoryResult?.listings || [],
              fetchedAt: categoryResult?.fetchedAt || new Date().toISOString(),
              pagesFetched: categoryResult?.pagesFetched || 0,
              budget: categoryResult?.budget || null
            };
          } else {
            return fallbackResponse("Provider não suportado.");
          }
        } catch (error) {
          if (provider !== "olx") throw error;
          const message = error instanceof Error ? error.message : String(error);
          aggregatedResult.errors.push({ category: categoryLabel, externalId: "*", error: message });
          aggregatedResult.categories.push({ category: categoryLabel, analyzed: 0, created: 0, skipped: 0 });
          continue;
        }

        console.log(`[ProviderSync][RC1.0.2][${categoryLabel}] pagination_end`, {
          pagesProcessed: paginated.pagesProcessed ?? paginated.pagesFetched ?? 0,
          stopReason: paginated.stopReason ?? "collector_result",
          maxPages: provider === "olx"
            ? paginated.maxPages ?? null
            : effectiveMaxPages,
          lastPageKnown: paginated.lastPageKnown ?? null
        });

        let categoryResult;
        try {
          categoryResult = await executeProviderSync({
            providerName: provider,
            empresaId,
            listings: paginated.listings,
            fetchedAt: paginated.fetchedAt ?? new Date().toISOString(),
            supabaseClient: supabaseAdmin,
            detectedAtFallbackNow: true,
            // OLX currently has no reliable createdAtFirst; do not synthesize one.
            allowListingsWithoutCreatedAtFirst: provider === "olx",
            existingProviderLeadIds: provider === "olx"
              ? new Map(
                (paginated.listings || [])
                  .filter((listing: any) => listing?.existingProviderLeadId)
                  .map((listing: any) => [String(listing.externalId), listing.existingProviderLeadId])
              )
              : null,
            syncStartedAtMs
          });
        } catch (error) {
          if (provider !== "olx") throw error;
          const message = error instanceof Error ? error.message : String(error);
          aggregatedResult.errors.push({ category: categoryLabel, externalId: "*", error: message });
          aggregatedResult.categories.push({ category: categoryLabel, analyzed: 0, created: 0, skipped: 0 });
          continue;
        }

        aggregatedResult.discovered += categoryResult.discovered;
        aggregatedResult.privateOwners += categoryResult.privateOwners;
        aggregatedResult.analyzedPrivateOwners += categoryResult.analyzedPrivateOwners;
        aggregatedResult.analyzedAgencies += categoryResult.analyzedAgencies;
        aggregatedResult.filteredByWindow += categoryResult.filteredByWindow;
        aggregatedResult.created += categoryResult.created;
        aggregatedResult.skipped += categoryResult.skipped;
        aggregatedResult.errors.push(
          ...(categoryResult.errors || []).map((errorItem) => ({
            category: categoryLabel,
            externalId: errorItem.externalId,
            error: errorItem.error
          }))
        );

        aggregatedResult.categories.push({
          category: categoryLabel,
          analyzed: categoryResult.discovered,
          created: categoryResult.created,
          skipped: categoryResult.skipped
        });

        if (jobId) {
          await ProviderJobService.updateJob(supabaseAdmin, jobId, {
            processed: aggregatedResult.discovered,
            total:     aggregatedResult.discovered,
            imported:  aggregatedResult.created,
            updated:   0,
            ignored:   aggregatedResult.skipped,
            errors:    aggregatedResult.errors.length
          });
        }

        console.log(`[${categoryLabel}] Resumo`, {
          analisados: categoryResult.discovered,
          novos: categoryResult.created,
          duplicados: categoryResult.skipped
        });

        if (paginated.budget?.scope === "global") {
          executionStatus = "budget_exhausted";
          break;
        }
      }

      if (olxCollectionSession?.budget?.exhausted) {
        executionStatus = "budget_exhausted";
      }

      const result = {
        ...aggregatedResult,
        status: executionStatus,
        budget: olxCollectionSession ? getOlxCollectionSessionStatus(olxCollectionSession) : null,
        executionSeconds: Number(((Date.now() - syncStartedAtMs) / 1000).toFixed(2))
      };

      console.log("[ProviderSync][RC1.0.2] execution_summary", {
        categorias: result.categories.length,
        anunciosAnalisados: result.discovered,
        novos: result.created,
        duplicados: result.skipped,
        tempoTotalSegundos: result.executionSeconds
      });

      result.categories.forEach((categorySummary) => {
        console.log("[ProviderSync][RC1.0.2] category_summary", {
          categoria: categorySummary.category,
          analisados: categorySummary.analyzed,
          novos: categorySummary.created,
          duplicados: categorySummary.skipped
        });
      });

      console.log("[ProviderSync][Diagnostics] executor_result", result);
      if (executionStatus === "budget_exhausted") {
        console.log("[SYNC] budget_exhausted", {
          provider,
          discovered: result.discovered,
          created: result.created,
          skipped: result.skipped,
          budget: result.budget,
          executionSeconds: result.executionSeconds,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log("[SYNC] completed", {
          provider,
          discovered: result.discovered,
          created: result.created,
          skipped: result.skipped,
          executionSeconds: result.executionSeconds,
          timestamp: new Date().toISOString()
        });
      }

      syncSucceeded = true;

      if (jobId) {
        await ProviderJobService.completeJob(supabaseAdmin, jobId, result as Record<string, unknown>);
      }

      return jsonResponse(200, {
        success: true,
        status: executionStatus,
        message: "Provider Sync executado com sucesso.",
        ...result,
        job_id: jobId ?? null,
        executedAt: new Date().toISOString()
      });
    } catch (error) {
      syncErrorMessage = error instanceof Error ? error.message : String(error);
      console.error("[SYNC] failed", {
        provider,
        error: syncErrorMessage,
        timestamp: new Date().toISOString()
      });
      if (jobId) {
        await ProviderJobService.failJob(supabaseAdmin, jobId, syncErrorMessage);
      }
      await releaseProviderLock();
      return fallbackResponse(syncErrorMessage);
    } finally {
      if (lockAcquired && !syncUnlockAttempted) {
        await releaseProviderLock();
      }
    }
  } catch (error) {
    console.error("[provider-sync] unhandled", error);
    return fallbackResponse(error instanceof Error ? error.message : String(error));
  }
});