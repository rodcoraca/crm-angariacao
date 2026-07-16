import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const MIN_PASSWORD_LENGTH = 8;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });
}

function normalizeIdentifier(value: unknown) {
  return String(value || "").trim();
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
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
        message: "Token inválido para alteração administrativa de password."
      });
    }

    const body = await request.json().catch(() => ({}));
    const authUserId = normalizeIdentifier(body?.authUserId);
    const password = String(body?.password || "");

    if (!authUserId) {
      return jsonResponse(400, {
        success: false,
        error: "missing_auth_user_id",
        message: "authUserId é obrigatório."
      });
    }

    if (!password) {
      return jsonResponse(400, {
        success: false,
        error: "missing_password",
        message: "password é obrigatória."
      });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return jsonResponse(400, {
        success: false,
        error: "weak_password",
        message: `password deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`
      });
    }

    const { data, error } = await adminClient.auth.admin.updateUserById(authUserId, {
      password
    });

    if (error) {
      return jsonResponse(Number(error.status || 400), {
        success: false,
        error: error.code || "auth_password_update_failed",
        message: error.message || "Falha ao alterar password no auth.users."
      });
    }

    return jsonResponse(200, {
      success: true,
      data: {
        userId: data?.user?.id || authUserId
      }
    });
  } catch (error) {
    return jsonResponse(500, {
      success: false,
      error: "unexpected_error",
      message: error instanceof Error ? error.message : "Erro interno na alteração administrativa de password."
    });
  }
});
