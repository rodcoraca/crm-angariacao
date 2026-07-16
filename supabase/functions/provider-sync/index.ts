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

    return jsonResponse(200, {
      success: true,
      message: "Provider Sync executado com sucesso.",
      ...result,
      executedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("[provider-sync] unhandled", error);
    return fallbackResponse(error instanceof Error ? error.message : String(error));
  }
});