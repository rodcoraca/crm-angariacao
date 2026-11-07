import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const BATCH_SIZE = 50;
const LEASE_DURATION_MINUTES = 20;
const REPAIR_FUNCTION_URL = Deno.env.get("SUPABASE_URL") + "/functions/v1/repair-imovirtual-location";

interface RepairRunResult {
  success: boolean;
  runId?: string;
  status?: string;
  fetched?: number;
  updated?: number;
  partial?: number;
  notFound?: number;
  httpErrors?: number;
  extractionErrors?: number;
  locationErrors?: number;
  updateErrors?: number;
  lastProcessedId?: string | null;
  hasMore?: boolean;
  message?: string;
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function claimRun(supabaseAdmin: any, owner: string): Promise<{ runId: string; lastProcessedId: string | null; recovered: boolean } | null> {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + LEASE_DURATION_MINUTES * 60 * 1000);

  const { data, error } = await supabaseAdmin.rpc("claim_repair_imovirtual_location_run", {
    p_owner: owner,
    p_now: now.toISOString(),
    p_lease_until: leaseUntil.toISOString(),
    p_batch_size: BATCH_SIZE
  });

  if (error) {
    console.error("[Scheduler] Erro ao reclamar execução:", error);
    return null;
  }

  if (!data || data.length === 0) {
    console.log("[Scheduler] Já existe uma execução ativa.");
    return null;
  }

  return {
    runId: data[0].run_id,
    lastProcessedId: data[0].last_processed_id,
    recovered: data[0].recovered || false
  };
}

async function heartbeat(supabaseAdmin: any, runId: string, owner: string): Promise<boolean> {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + LEASE_DURATION_MINUTES * 60 * 1000);

  const { data, error } = await supabaseAdmin.rpc("heartbeat_repair_imovirtual_location_run", {
    p_run_id: runId,
    p_owner: owner,
    p_now: now.toISOString(),
    p_lease_until: leaseUntil.toISOString()
  });

  if (error) {
    console.error("[Scheduler] Erro no heartbeat:", error);
    return false;
  }

  return data === true;
}

async function finishRun(
  supabaseAdmin: any,
  runId: string,
  owner: string,
  status: string,
  result: RepairRunResult
): Promise<boolean> {
  const now = new Date();

  const { data, error } = await supabaseAdmin.rpc("finish_repair_imovirtual_location_run", {
    p_run_id: runId,
    p_owner: owner,
    p_status: status,
    p_completed_at: now.toISOString(),
    p_last_processed_id: result.lastProcessedId || null,
    p_fetched_count: result.fetched || 0,
    p_updated_count: result.updated || 0,
    p_partial_count: result.partial || 0,
    p_not_found_count: result.notFound || 0,
    p_http_error_count: result.httpErrors || 0,
    p_extraction_error_count: result.extractionErrors || 0,
    p_location_error_count: result.locationErrors || 0,
    p_update_error_count: result.updateErrors || 0,
    p_error_details: result.success ? [] : [{ message: result.message || "Erro desconhecido" }]
  });

  if (error) {
    console.error("[Scheduler] Erro ao finalizar execução:", error);
    return false;
  }

  return data === true;
}

async function executeRepairBatch(
  supabaseAdmin: any,
  runId: string,
  owner: string,
  afterId: string | null
): Promise<RepairRunResult> {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  // Chamar a função de repair existente com autenticação service_role
  const response = await fetch(REPAIR_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify({
      batchSize: BATCH_SIZE,
      afterId: afterId || undefined
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      message: `HTTP ${response.status}: ${errorText}`
    };
  }

  const result = await response.json();
  return {
    success: true,
    runId,
    ...result
  };
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

    // Autenticação interna: apenas service_role pode executar
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token !== serviceRoleKey) {
      return jsonResponse(401, { success: false, message: "Apenas service_role pode executar este scheduler." });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const owner = `scheduler-${crypto.randomUUID()}`;

    // 1. Reclamar execução
    const claimed = await claimRun(supabaseAdmin, owner);
    if (!claimed) {
      return jsonResponse(200, {
        success: true,
        message: "Já existe uma execução ativa ou erro ao reclamar.",
        skipped: true
      });
    }

    const { runId, lastProcessedId, recovered } = claimed;
    console.log(`[Scheduler] Execução reclamada: ${runId}, cursor: ${lastProcessedId || "início"}, recuperada: ${recovered}`);

    try {
      // 2. Executar batch de reparação
      const result = await executeRepairBatch(supabaseAdmin, runId, owner, lastProcessedId);

      // 3. Heartbeat antes de finalizar
      await heartbeat(supabaseAdmin, runId, owner);

      // 4. Determinar status final
      let finalStatus = "completed";
      if (!result.success) {
        finalStatus = "failed";
      } else if (!result.hasMore) {
        finalStatus = "no_more_records";
      }

      // 5. Finalizar execução
      await finishRun(supabaseAdmin, runId, owner, finalStatus, result);

      console.log(`[Scheduler] Execução finalizada: ${finalStatus}`, {
        fetched: result.fetched,
        updated: result.updated,
        partial: result.partial,
        notFound: result.notFound,
        hasMore: result.hasMore
      });

      return jsonResponse(200, {
        success: true,
        runId,
        status: finalStatus,
        ...result
      });

    } catch (error) {
      console.error("[Scheduler] Erro durante execução:", error);

      await finishRun(supabaseAdmin, runId, owner, "failed", {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      });

      return jsonResponse(500, {
        success: false,
        runId,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
