import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type JsonMap = Record<string, unknown>;

type AuthAdminUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
};

type AuthAdminListResult = {
  users?: AuthAdminUser[];
  nextPage?: number | null;
};

function jsonResponse(status: number, body: JsonMap) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function normalizeIdentifier(value: unknown) {
  return String(value || "").trim();
}

function normalizeEmail(value: unknown) {
  return normalizeIdentifier(value).toLowerCase();
}

async function findAuthUserByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  const targetEmail = normalizeEmail(email);
  if (!targetEmail) return null;

  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const typedData = (data || {}) as AuthAdminListResult;
    const users = typedData.users || [];
    const found = users.find((user) => normalizeEmail(user?.email) === targetEmail) || null;
    if (found) return found;

    if (!users.length || !typedData.nextPage) {
      break;
    }

    page = typedData.nextPage;
  }

  return null;
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
        message: "Token inválido para reparar associação."
      });
    }

    const payload = await request.json().catch(() => ({}));
    const usuarioId = normalizeIdentifier(payload?.usuarioId);
    const email = normalizeEmail(payload?.email);
    const empresaId = normalizeIdentifier(payload?.empresaId) || null;
    const actorUserId = normalizeIdentifier(payload?.actorUserId) || null;

    if (!usuarioId || !email) {
      return jsonResponse(400, {
        success: false,
        error: "missing_payload",
        message: "usuarioId e email são obrigatórios para reparação."
      });
    }

    let userProfileQuery = adminClient
      .from("usuarios")
      .select("id,auth_user_id,email,account_status,empresa_id")
      .eq("id", usuarioId);

    if (empresaId) {
      userProfileQuery = userProfileQuery.eq("empresa_id", empresaId);
    }

    const { data: profile, error: profileError } = await userProfileQuery.maybeSingle();
    if (profileError) {
      return jsonResponse(400, {
        success: false,
        error: profileError.code || "profile_lookup_failed",
        message: profileError.message || "Falha ao localizar utilizador para reparação."
      });
    }

    if (!profile) {
      return jsonResponse(404, {
        success: false,
        error: "profile_not_found",
        message: "Utilizador não encontrado para reparação."
      });
    }

    const authUser = await findAuthUserByEmail(adminClient, email);
    if (!authUser?.id) {
      return jsonResponse(404, {
        success: false,
        error: "auth_user_not_found",
        message: "Não foi encontrado auth.users para o email informado."
      });
    }

    const nowIso = new Date().toISOString();
    const shouldAutoActivate = Boolean(authUser.email_confirmed_at) && String(profile.account_status || "").toLowerCase() === "pending_activation";

    const updatePayload: JsonMap = {
      auth_user_id: authUser.id,
      updated_at: nowIso
    };

    if (shouldAutoActivate) {
      updatePayload.account_status = "active";
      updatePayload.activated_at = nowIso;
      updatePayload.disabled_at = null;
      updatePayload.ativo = true;
    }

    const { data: updatedProfile, error: updateError } = await adminClient
      .from("usuarios")
      .update(updatePayload)
      .eq("id", usuarioId)
      .select("id,auth_user_id,email,account_status,activated_at,empresa_id,nome,apelido,telefone,username,ativo,activation_sent_at,disabled_at,permissoes,created_at,updated_at")
      .maybeSingle();

    if (updateError) {
      return jsonResponse(400, {
        success: false,
        error: updateError.code || "profile_update_failed",
        message: updateError.message || "Falha ao atualizar associação auth_user_id."
      });
    }

    await adminClient
      .from("audit_logs")
      .insert([
        {
          event_type: "update",
          status: "success",
          user_id: actorUserId || callerData.user.id,
          empresa_id: updatedProfile?.empresa_id || profile.empresa_id || null,
          modulo: "users",
          entidade: "usuarios",
          entidade_id: usuarioId,
          user_agent: request.headers.get("user-agent") || null,
          metadata: {
            action: "repair_auth_association",
            previousAuthUserId: profile.auth_user_id || null,
            nextAuthUserId: authUser.id,
            email,
            autoActivated: shouldAutoActivate
          },
          created_at: nowIso
        }
      ]);

    return jsonResponse(200, {
      success: true,
      message: "Associação reparada com sucesso.",
      data: {
        profile: updatedProfile || null,
        autoActivated: shouldAutoActivate
      }
    });
  } catch (error) {
    return jsonResponse(500, {
      success: false,
      error: "unexpected_error",
      message: error instanceof Error ? error.message : "Erro interno ao reparar associação."
    });
  }
});
