import { createClient } from "npm:@supabase/supabase-js";
import {
  fetchImovirtualSearchPage,
  collectImovirtualPaginatedListings,
  executeProviderSync,
  warnMissingEmpresaId
} from "../../../src/shared/provider-engine/index.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const FALLBACK_MESSAGE = "Provider Sync indisponível.";
const MAX_PAGES = 20;
const STALE_LOCK_WINDOW_MS = 30 * 60 * 1000;
const SYNC_INTERVAL_MINUTES = 240;

/**
 * RC1.0.2
 *
 * A pesquisa genérica "/comprar" foi removida
 * devido à baixa cobertura e enviesamento
 * para anúncios profissionais.
 *
 * A recolha passa a utilizar categorias
 * específicas do Imovirtual.
 *
 * Mantidas integralmente:
 *
 * - Paginação RC1.0.1
 * - Janela temporal 30/7
 * - Deduplicação provider + external_id
 * - Fluxo Radar
 * - Fluxo CRM
 *
 * NÃO alterar esta rotina sem auditoria
 * prévia de regressão.
 */
const IMOVIRTUAL_SEARCH_URLS = [
  "https://www.imovirtual.com/pt/resultados/comprar/apartamento",
  "https://www.imovirtual.com/pt/resultados/comprar/moradia",
  "https://www.imovirtual.com/pt/resultados/comprar/terreno",
  "https://www.imovirtual.com/pt/resultados/comprar/armazens",
  "https://www.imovirtual.com/pt/resultados/comprar/garagem",
  "https://www.imovirtual.com/pt/resultados/comprar/empreendimentos"
];

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

async function loadRegistryRow(supabaseAdmin: ReturnType<typeof createClient>, provider: string) {
  const { data, error } = await supabaseAdmin
    .from("provider_registry")
    .select("provider_code,sync_running,last_execution,next_execution,last_error")
    .eq("provider_code", provider)
    .maybeSingle();

  return { data, error };
}

async function lockProvider(supabaseAdmin: ReturnType<typeof createClient>, provider: string) {
  const nowIso = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("provider_registry")
    .update({
      sync_running: true,
      last_execution: nowIso,
      last_error: null
    })
    .eq("provider_code", provider);

  if (error) {
    console.error("[LOCK] lock_failed", {
      provider,
      error: error.message,
      timestamp: nowIso
    });
    return { ok: false, error };
  }

  console.log("[LOCK] lock_acquired", {
    provider,
    timestamp: nowIso
  });

  return { ok: true };
}

async function unlockProvider({
  supabaseAdmin,
  provider,
  success,
  errorMessage
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  provider: string;
  success: boolean;
  errorMessage?: string | null;
}) {
  const now = new Date();
  const nowIso = now.toISOString();
  const nextExecutionIso = computeNextExecution(success, now);

  const { error } = await supabaseAdmin
    .from("provider_registry")
    .update({
      sync_running: false,
      last_execution: nowIso,
      next_execution: nextExecutionIso,
      last_error: success ? null : (errorMessage || "Provider Sync indisponível.")
    })
    .eq("provider_code", provider);

  if (error) {
    console.error("[UNLOCK] unlock_failed", {
      provider,
      success,
      error: error.message,
      timestamp: nowIso
    });
    return;
  }

  console.log("[UNLOCK] unlock_applied", {
    provider,
    success,
    nextExecution: nextExecutionIso,
    timestamp: nowIso
  });
}

async function unlockStaleLockIfNeeded(supabaseAdmin: ReturnType<typeof createClient>, provider: string) {
  const { data: registryRow, error } = await loadRegistryRow(supabaseAdmin, provider);

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

  const nowMs = Date.now();
  const lastExecution = toDateOrNull(registryRow.last_execution);
  const isStale = !lastExecution || (nowMs - lastExecution.getTime()) > STALE_LOCK_WINDOW_MS;

  if (!isStale) {
    console.log("[LOCK] running_active", {
      provider,
      lastExecution: registryRow.last_execution || null,
      timestamp: new Date().toISOString()
    });
    return { ok: true, blocked: true, reason: "already_running" };
  }

  console.log("[UNLOCK] watchdog_triggered", {
    provider,
    lastExecution: registryRow.last_execution || null,
    timestamp: new Date().toISOString()
  });

  await unlockProvider({
    supabaseAdmin,
    provider,
    success: false,
    errorMessage: "Watchdog desbloqueou lock órfão"
  });

  return { ok: true, blocked: false, watchdogUnlocked: true };
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
    let lockAcquired = false;
    let syncSucceeded = false;
    let syncErrorMessage: string | null = null;

    console.log("[SYNC] request_received", {
      provider,
      empresaId: empresaId || null,
      timestamp: new Date().toISOString()
    });

    if (provider !== "imovirtual") {
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

    const watchdog = await unlockStaleLockIfNeeded(supabaseAdmin, provider);
    if (!watchdog.ok) {
      return fallbackResponse(`Watchdog falhou: ${watchdog.reason || "erro desconhecido"}`);
    }

    if (watchdog.blocked) {
      return fallbackResponse("Sincronização já em execução.");
    }

    const lockResult = await lockProvider(supabaseAdmin, provider);
    if (!lockResult.ok) {
      return fallbackResponse("Falha ao adquirir lock de sincronização.");
    }
    lockAcquired = true;

    try {
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

      for (const searchUrl of IMOVIRTUAL_SEARCH_URLS) {
        const categoryLabel = getCategoryLabel(searchUrl);

        const paginated = await collectImovirtualPaginatedListings({
          maxPages: MAX_PAGES,
          fetchPage: (page: number) => fetchImovirtualSearchPage({
            searchUrl,
            page,
            fetchImpl: globalThis.fetch
          }),
          onPage: ({ page, found }: { page: number; found: number; totalPages: number | null }) => {
            console.log(`[${categoryLabel}] Página ${page} -> ${found} anúncios`);
          }
        });

        console.log(`[ProviderSync][RC1.0.2][${categoryLabel}] pagination_end`, {
          pagesProcessed: paginated.pagesProcessed,
          stopReason: paginated.stopReason,
          maxPages: paginated.maxPages,
          lastPageKnown: paginated.lastPageKnown
        });

        const categoryResult = await executeProviderSync({
          providerName: provider,
          empresaId,
          listings: paginated.listings,
          fetchedAt: paginated.fetchedAt,
          supabaseClient: supabaseAdmin,
          detectedAtFallbackNow: true,
          syncStartedAtMs
        });

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

        console.log(`[${categoryLabel}] Resumo`, {
          analisados: categoryResult.discovered,
          novos: categoryResult.created,
          duplicados: categoryResult.skipped
        });
      }

      const result = {
        ...aggregatedResult,
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
      console.log("[SYNC] completed", {
        provider,
        discovered: result.discovered,
        created: result.created,
        skipped: result.skipped,
        executionSeconds: result.executionSeconds,
        timestamp: new Date().toISOString()
      });

      syncSucceeded = true;

      return jsonResponse(200, {
        success: true,
        message: "Provider Sync executado com sucesso.",
        ...result,
        executedAt: new Date().toISOString()
      });
    } catch (error) {
      syncErrorMessage = error instanceof Error ? error.message : String(error);
      console.error("[SYNC] failed", {
        provider,
        error: syncErrorMessage,
        timestamp: new Date().toISOString()
      });
      return fallbackResponse(syncErrorMessage);
    } finally {
      if (lockAcquired) {
        await unlockProvider({
          supabaseAdmin,
          provider,
          success: syncSucceeded,
          errorMessage: syncErrorMessage
        });
      }
    }
  } catch (error) {
    console.error("[provider-sync] unhandled", error);
    return fallbackResponse(error instanceof Error ? error.message : String(error));
  }
});