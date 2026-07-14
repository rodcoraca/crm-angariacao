import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, {
      success: false,
      error: "method_not_allowed",
      message: "Método não suportado."
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, {
        success: false,
        error: "missing_runtime_secrets",
        message: "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas."
      });
    }

    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return jsonResponse(401, {
        success: false,
        error: "missing_bearer_token",
        message: "Authorization Bearer token obrigatório."
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: callerData, error: callerError } = await adminClient.auth.getUser(token);
    if (callerError || !callerData?.user) {
      return jsonResponse(401, {
        success: false,
        error: "invalid_bearer_token",
        message: "Token inválido para invocar envio de convite."
      });
    }

    const payload = await request.json().catch(() => ({}));
    const email = String(payload?.email || "").trim().toLowerCase();
    const redirectToRaw = String(payload?.redirectTo || "").trim();

    if (!email) {
      return jsonResponse(400, {
        success: false,
        error: "missing_email",
        message: "Email obrigatório para envio de convite."
      });
    }

    const options = redirectToRaw ? { redirectTo: redirectToRaw } : undefined;
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, options);

    if (error) {
      return jsonResponse(400, {
        success: false,
        error: error.code || "invite_failed",
        message: error.message || "Falha ao enviar convite de ativação."
      });
    }

    return jsonResponse(200, {
      success: true,
      message: "Convite enviado com sucesso.",
      data: {
        user: data?.user
          ? {
              id: data.user.id,
              email: data.user.email || email
            }
          : null
      }
    });
  } catch (error) {
    return jsonResponse(500, {
      success: false,
      error: "unexpected_error",
      message: error instanceof Error ? error.message : "Erro interno ao enviar convite."
    });
  }
});
