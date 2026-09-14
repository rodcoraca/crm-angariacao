import { createClient } from "npm:@supabase/supabase-js";
import { enviarEscalaPublicadaPorEmail } from "../_shared/notifications/PublishedScheduleEmailService.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function text(value: unknown) {
  return String(value || "").trim();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse(405, { ok: false, error: "method_not_allowed" });

  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!token || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(401, { ok: false, error: "authentication_unavailable" });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return jsonResponse(401, { ok: false, error: "unauthorized" });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: profile, error: profileError } = await adminClient
    .from("usuarios")
    .select("id,empresa_id,auth_user_id,ativo,account_status")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();
  if (profileError || !profile || profile.ativo === false || ["disabled", "inactive"].includes(text(profile.account_status).toLowerCase())) {
    return jsonResponse(403, { ok: false, error: "profile_not_authorized" });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const escalaId = text(body.escalaId);
  const tipo = text(body.tipo);
  if (!escalaId || !["servico", "plantao"].includes(tipo)) {
    return jsonResponse(400, { ok: false, error: "invalid_schedule" });
  }

  try {
    const result = await enviarEscalaPublicadaPorEmail({
      adminClient,
      empresaId: profile.empresa_id,
      userId: profile.id,
      escalaId,
      tipo: tipo as "servico" | "plantao"
    });
    return jsonResponse(200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "email_send_failed");
    console.error("[send-published-schedule-email] failed", { message, escalaId, tipo, empresaId: profile.empresa_id });
    return jsonResponse(message === "escala_nao_publicada" ? 409 : 500, { ok: false, error: message, enviados: 0, falhados: 0, total: 0, destinatarios: [] });
  }
});
