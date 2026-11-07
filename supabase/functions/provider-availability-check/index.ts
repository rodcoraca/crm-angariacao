import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js";
import {
  checkProviderListingAvailability,
  processProviderAvailabilityLeads
} from "../../../src/shared/provider-engine/availability.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const PAGE_SIZE = 50;
const RUN_SCOPE = "global";
const LEASE_MS = 60_000;
const HEARTBEAT_MS = 10_000;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function tokenFromRequest(request: Request) {
  const value = request.headers.get("Authorization") || "";
  return value.replace(/^Bearer\s+/i, "").trim();
}

async function isAuthorized(
  client: SupabaseClient<any>,
  token: string,
  serviceRoleKey: string
) {
  if (token && token === serviceRoleKey) return true;
  if (!token) return false;

  const { data: callerData, error: callerError } = await client.auth.getUser(token);
  if (callerError || !callerData?.user?.id) return false;

  const { data: roles, error: rolesError } = await client
    .from("user_roles")
    .select("empresa_id,roles(code)")
    .eq("user_id", callerData.user.id);

  if (rolesError) return false;

  return (roles || []).some((row) => {
    if (row?.empresa_id) return false;

    const assignedRoles = Array.isArray(row?.roles)
      ? row.roles
      : row?.roles
        ? [row.roles]
        : [];

    return assignedRoles.some((role) =>
      String(role?.code || "").trim().toUpperCase() === "ADMIN"
    );
  });
}

async function loadActiveLeads(
  client: SupabaseClient<any>,
  provider: string | null,
  afterId: string | null
) {
  let query = client
    .from("provider_leads")
    .select("id,provider,external_id,url,provider_active")
    .eq("provider_active", true)
    .not("url", "is", null)
    .order("id", { ascending: true })
    .limit(PAGE_SIZE);

  if (provider) query = query.eq("provider", provider);
  if (afterId) query = query.gt("id", afterId);

  const { data, error } = await query;

  if (error) throw error;

  return (data || []) as Array<Record<string, unknown>>;
}

async function finishRun(
  client: SupabaseClient<any>,
  runId: string,
  owner: string,
  status: "completed" | "failed",
  counts: Record<string, number>,
  errors: unknown[],
  omittedErrors: number
) {
  const { data, error } = await client.rpc("finish_provider_availability_run", {
    p_run_id: runId,
    p_owner: owner,
    p_status: status,
    p_completed_at: new Date().toISOString(),
    p_checked_count: counts.checked || 0,
    p_available_count: counts.available || 0,
    p_inactivated_count: counts.inactivated || 0,
    p_inconclusive_count: counts.inconclusive || 0,
    p_error_count: counts.errors || 0,
    p_error_details: errors,
    p_error_details_omitted_count: omittedErrors || 0
  });
  if (error || data !== true) {
    console.error("[provider-availability-check] run_finalization_failed", {
      runId,
      code: error?.code || "run_not_owned",
      message: error?.message?.slice(0, 240) || null
    });
    return false;
  }
  return true;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse(405, { success: false, error: "method_not_allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { success: false, error: "missing_runtime_secrets" });

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const token = tokenFromRequest(request);

  if (!(await isAuthorized(client, token, serviceRoleKey))) {
    return jsonResponse(401, { success: false, error: "unauthorized" });
  }

  let runId: string | null = null;
  let runOwner: string | null = null;
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const requestedProvider = String(body?.provider || "").trim().toLowerCase();
    const provider = requestedProvider || null;
    const afterId = body?.after_id
      ? String(body.after_id).trim()
      : null;

    if (afterId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(afterId)) {
      return jsonResponse(400, { success: false, error: "invalid_after_id" });
    }

    const runProvider = provider || RUN_SCOPE;

    if (provider && !["imovirtual", "custojusto", "olx"].includes(provider)) {
      return jsonResponse(400, { success: false, error: "unsupported_provider" });
    }

    runOwner = crypto.randomUUID();
    const now = new Date();
    const { data: claimedRuns, error: claimError } = await client.rpc("claim_provider_availability_run", {
      p_provider: runProvider,
      p_owner: runOwner,
      p_now: now.toISOString(),
      p_lease_until: new Date(now.getTime() + LEASE_MS).toISOString()
    });
    if (claimError) throw claimError;
    const run = Array.isArray(claimedRuns) ? claimedRuns[0] : null;
    if (!run?.run_id) return jsonResponse(409, { success: false, error: "availability_run_already_running" });
    runId = String(run.run_id);

    let lastHeartbeat = 0;
    let heartbeatPromise: Promise<boolean> | null = null;
    const ensureLease = async (force = false) => {
      const timestamp = Date.now();
      if (!force && timestamp - lastHeartbeat < HEARTBEAT_MS) return true;
      if (!heartbeatPromise) {
        heartbeatPromise = Promise.resolve(
          client.rpc("heartbeat_provider_availability_run", {
            p_run_id: runId,
            p_owner: runOwner,
            p_now: new Date(timestamp).toISOString(),
            p_lease_until: new Date(timestamp + LEASE_MS).toISOString()
          })
        ).then(({ data, error }) => {
          if (error) throw error;
          if (data !== true) throw new Error("availability_run_lease_lost");
          lastHeartbeat = Date.now();
          return true;
        }).finally(() => { heartbeatPromise = null; });
      }
      const owned = await heartbeatPromise;
      if (!owned) throw new Error("availability_run_lease_lost");
      return owned;
    };

    const leads = await loadActiveLeads(client, provider, afterId);
    const result = await processProviderAvailabilityLeads(leads, {
      checkAvailability: async (lead) => {
        await ensureLease();
        return checkProviderListingAvailability({
          provider: String(lead.provider || ""),
          externalId: String(lead.external_id || ""),
          url: String(lead.url || "")
        });
      },
      inactivateLead: async (lead) => {
        await ensureLease(true);
        const { data, error } = await client.rpc("inactivate_provider_lead_if_run_owner", {
          p_run_id: runId,
          p_owner: runOwner,
          p_lead_id: lead.id,
          p_now: new Date().toISOString()
        });
        if (error) throw error;
        return data === true;
      }
    });

    await ensureLease(true);
    const persisted = await finishRun(client, runId, runOwner, "completed", result.counts, result.errors, result.omittedErrors);
    if (!persisted) return jsonResponse(500, { success: false, error: "availability_result_not_persisted", run_id: runId });

    return jsonResponse(200, {
      success: true,
      run_id: runId,
      provider: runProvider,
      ...result.counts,
      next_cursor: leads.length === PAGE_SIZE
        ? String(leads[leads.length - 1].id)
        : null,
      errors: result.errors,
      omitted_errors: result.omittedErrors
    });
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error).slice(0, 500);
    if (runId && runOwner) {
      const persisted = await finishRun(client, runId, runOwner, "failed", {
        checked: 0, available: 0, inactivated: 0, inconclusive: 0, errors: 1
      }, [{ code: "run_failed", message }], 0);
      if (!persisted) console.error("[provider-availability-check] failure_state_not_persisted", { runId });
    }
    console.error("[provider-availability-check] failed", { runId, error: message });
    return jsonResponse(500, { success: false, error: "availability_check_failed", run_id: runId });
  }
});

