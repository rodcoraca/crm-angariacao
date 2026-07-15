import { createClient } from "npm:@supabase/supabase-js";
import {
  fetchImovirtualSearchPage,
  extractListings,
  extractNextData,
  executeProviderSync,
  warnMissingEmpresaId
} from "../../../src/shared/provider-engine/index.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const FALLBACK_MESSAGE = "Provider Sync indisponível.";

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

    const { html, fetchedAt } = await fetchImovirtualSearchPage({
      district: "porto",
      page: 1,
      fetchImpl: globalThis.fetch
    });
    console.log("[ProviderSync][Diagnostics] html_fetch_ok", {
      htmlLength: html?.length || 0,
      fetchedAt
    });

    const nextData = extractNextData(html);
    console.log("[ProviderSync][Diagnostics] next_data_extracted", {
      hasNextData: Boolean(nextData)
    });

    const listings = extractListings(nextData);
    console.log("[ProviderSync]", listings.length);
    console.log("[ProviderSync][Diagnostics] listings_to_process", {
      total: listings.length
    });

    console.log("[provider-sync] listings_extracted", { total: listings.length });

    const result = await executeProviderSync({
      providerName: provider,
      empresaId,
      listings,
      fetchedAt,
      supabaseClient: supabaseAdmin,
      detectedAtFallbackNow: true
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