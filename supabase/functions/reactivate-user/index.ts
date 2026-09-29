import { createClient } from "npm:@supabase/supabase-js";
import { NotificationService } from "../_shared/notifications/NotificationService.ts";
import { buildUserActivationNotification } from "../_shared/notifications/templates/userActivation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

type JsonMap = Record<string, unknown>;

type AuthUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
};

function jsonResponse(status: number, body: JsonMap) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });
}

function text(value: unknown) {
  return String(value || "").trim();
}

function email(value: unknown) {
  return text(value).toLowerCase();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isAllowedRedirect(value: string) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return ["app.osflow.pt", "localhost", "127.0.0.1"].includes(url.hostname);
  } catch (_error) {
    return false;
  }
}

const DEFAULT_ACTIVATION_REDIRECT = "https://app.osflow.pt/?activation=1";

async function writeAudit(
  adminClient: ReturnType<typeof createClient>,
  context: {
    operatorId?: string | null;
    empresaId?: string | null;
    usuarioId?: string | null;
    authUserId?: string | null;
    action: string;
    status: "success" | "error" | "denied";
    previousEmail?: string | null;
    targetEmail?: string | null;
    previousStatus?: string | null;
    nextStatus?: string | null;
    error?: string | null;
  }
) {
  const { error } = await adminClient.from("audit_logs").insert([{
    user_id: context.operatorId || null,
    empresa_id: context.empresaId || null,
    modulo: "users",
    entidade: "usuarios",
    entidade_id: context.usuarioId || null,
    event_type: "update",
    status: context.status,
    metadata: {
      action: context.action,
      usuarioId: context.usuarioId || null,
      authUserId: context.authUserId || null,
      previousEmail: context.previousEmail || null,
      targetEmail: context.targetEmail || null,
      previousStatus: context.previousStatus || null,
      nextStatus: context.nextStatus || null,
      result: context.status,
      error: context.error || null
    },
    created_at: new Date().toISOString()
  }]);

  if (error) {
    console.error("[reactivate-user] audit_failed", {
      usuarioId: context.usuarioId || null,
      authUserId: context.authUserId || null,
      action: context.action,
      status: context.status,
      error: error.message
    });
  }

  return error;
}

async function findAuthUserByEmail(adminClient: ReturnType<typeof createClient>, targetEmail: string) {
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = (data?.users || []) as AuthUser[];
    const found = users.find((user) => email(user.email) === targetEmail) || null;
    if (found) return found;
    if (!users.length || !data?.nextPage) return null;
    page = data.nextPage;
  }
}

async function hasUsersEditPermission(
  adminClient: ReturnType<typeof createClient>,
  operatorId: string,
  empresaId: string
) {
  const { data: operatorProfile, error: operatorError } = await adminClient
    .from("usuarios")
    .select("id")
    .eq("auth_user_id", operatorId)
    .eq("empresa_id", empresaId)
    .maybeSingle();

  if (operatorError || !operatorProfile) return false;

  const { data: roleRows, error: roleError } = await adminClient
    .from("user_roles")
    .select("role_id,empresa_id")
    .eq("user_id", operatorId)
    .or(`empresa_id.is.null,empresa_id.eq.${empresaId}`);

  if (roleError) throw roleError;

  const roleIds = (roleRows || []).map((row) => row.role_id).filter(Boolean);
  if (!roleIds.length) return false;

  const { data: permissionRows, error: permissionError } = await adminClient
    .from("role_permissions")
    .select("permissions!inner(code,is_active)")
    .in("role_id", roleIds);

  if (permissionError) throw permissionError;

  return (permissionRows || []).some((row) =>
    row.permissions?.is_active !== false && row.permissions?.code === "users.edit"
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { success: false, error: "method_not_allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { success: false, error: "missing_runtime_secrets" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  let operatorId: string | null = null;
  let empresaId: string | null = null;
  let usuarioId: string | null = null;
  let authUserId: string | null = null;
  let previousEmail: string | null = null;
  let targetEmail: string | null = null;
  let previousStatus: string | null = null;
  const action = "reactivate_user";

  try {
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return jsonResponse(401, { success: false, error: "missing_bearer_token" });

    const { data: callerData, error: callerError } = await adminClient.auth.getUser(token);
    if (callerError || !callerData?.user?.id) {
      return jsonResponse(401, { success: false, error: "invalid_bearer_token" });
    }
    operatorId = callerData.user.id;

    const body = await request.json().catch(() => ({}));
    usuarioId = text(body?.usuarioId) || null;
    const requestedEmail = email(body?.targetEmail);
    const requestedRedirect = text(body?.redirectTo);
    const redirectTo = requestedRedirect || DEFAULT_ACTIVATION_REDIRECT;

    if (!usuarioId) {
      return jsonResponse(400, { success: false, error: "missing_usuario_id" });
    }

    const { data: profile, error: profileError } = await adminClient
      .from("usuarios")
      .select("id,auth_user_id,email,empresa_id,account_status,nome,username")
      .eq("id", usuarioId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return jsonResponse(404, { success: false, error: "profile_not_found" });

    empresaId = text(profile.empresa_id) || null;
    previousEmail = email(profile.email) || null;
    previousStatus = text(profile.account_status) || null;
    authUserId = text(profile.auth_user_id) || null;
    targetEmail = requestedEmail || previousEmail;

    if (!empresaId) {
      await writeAudit(adminClient, { operatorId, usuarioId, authUserId, action, status: "denied", error: "missing_empresa_id" });
      return jsonResponse(400, { success: false, error: "missing_empresa_id" });
    }

    if (!(await hasUsersEditPermission(adminClient, operatorId, empresaId))) {
      await writeAudit(adminClient, { operatorId, empresaId, usuarioId, authUserId, action, status: "denied", previousEmail, targetEmail, previousStatus, error: "permission_denied" });
      return jsonResponse(403, { success: false, error: "permission_denied" });
    }

    if (!authUserId) {
      await writeAudit(adminClient, { operatorId, empresaId, usuarioId, action, status: "error", previousEmail, targetEmail, previousStatus, error: "missing_auth_user_id" });
      return jsonResponse(409, { success: false, error: "missing_auth_user_id" });
    }

    if (!targetEmail || !isEmail(targetEmail)) {
      await writeAudit(adminClient, { operatorId, empresaId, usuarioId, authUserId, action, status: "error", previousEmail, targetEmail, previousStatus, error: "invalid_target_email" });
      return jsonResponse(400, { success: false, error: "invalid_target_email" });
    }

    if (!isAllowedRedirect(redirectTo)) {
      await writeAudit(adminClient, { operatorId, empresaId, usuarioId, authUserId, action, status: "error", previousEmail, targetEmail, previousStatus, error: "invalid_redirect" });
      return jsonResponse(400, { success: false, error: "invalid_redirect" });
    }

    const { data: authResult, error: authLookupError } = await adminClient.auth.admin.getUserById(authUserId);
    if (authLookupError || !authResult?.user) {
      await writeAudit(adminClient, { operatorId, empresaId, usuarioId, authUserId, action, status: "error", previousEmail, targetEmail, previousStatus, error: "auth_user_not_found" });
      return jsonResponse(409, { success: false, error: "auth_user_not_found" });
    }

    const authUser = authResult.user as AuthUser;
    const existingTarget = await findAuthUserByEmail(adminClient, targetEmail);
    if (existingTarget && existingTarget.id !== authUserId) {
      await writeAudit(adminClient, { operatorId, empresaId, usuarioId, authUserId, action, status: "error", previousEmail, targetEmail, previousStatus, error: "email_already_in_use" });
      return jsonResponse(409, { success: false, error: "email_already_in_use" });
    }

    const emailChanged = email(authUser.email) !== targetEmail;
    if (emailChanged) {
      const authUpdate = await adminClient.auth.admin.updateUserById(authUserId, { email: targetEmail });
      if (authUpdate.error) throw authUpdate.error;
    }

    const linkResult = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: targetEmail,
      options: { redirectTo }
    });

    if (linkResult.error || !linkResult.data?.properties?.action_link) {
      const error = linkResult.error || new Error("activation_link_generation_failed");
      if (emailChanged) {
        const rollback = await adminClient.auth.admin.updateUserById(authUserId, { email: email(authUser.email) });
        if (rollback.error) {
          await writeAudit(adminClient, { operatorId, empresaId, usuarioId, authUserId, action: "change_email_and_reactivate", status: "error", previousEmail, targetEmail, previousStatus, error: `activation_link_generation_failed;rollback_failed:${rollback.error.message}` });
          return jsonResponse(500, { success: false, error: "activation_rollback_failed" });
        }
      }
      await writeAudit(adminClient, { operatorId, empresaId, usuarioId, authUserId, action: emailChanged ? "change_email_and_reactivate" : action, status: "error", previousEmail, targetEmail, previousStatus, error: error.message || "activation_link_generation_failed" });
      return jsonResponse(502, { success: false, error: "activation_link_generation_failed" });
    }

    const notification = await NotificationService.send(buildUserActivationNotification({
      nome: text(profile.nome),
      actionLink: linkResult.data.properties.action_link,
      recipient: targetEmail
    }), { adminClient });

    if (!notification.ok) {
      if (emailChanged) {
        const rollback = await adminClient.auth.admin.updateUserById(authUserId, { email: email(authUser.email) });
        if (rollback.error) {
          await writeAudit(adminClient, { operatorId, empresaId, usuarioId, authUserId, action: "change_email_and_reactivate", status: "error", previousEmail, targetEmail, previousStatus, error: `activation_send_failed;rollback_failed:${rollback.error.message}` });
          return jsonResponse(500, { success: false, error: "activation_rollback_failed" });
        }
      }
      await writeAudit(adminClient, { operatorId, empresaId, usuarioId, authUserId, action: emailChanged ? "change_email_and_reactivate" : action, status: "error", previousEmail, targetEmail, previousStatus, error: notification.error || "activation_send_failed" });
      return jsonResponse(502, { success: false, error: "activation_send_failed" });
    }

    const nextStatus = "pending_activation";
    const activationSentAt = new Date().toISOString();
    const { error: profileUpdateError } = await adminClient
      .from("usuarios")
      .update({
        email: targetEmail,
        account_status: nextStatus,
        activation_sent_at: activationSentAt,
        activated_at: null,
        disabled_at: null,
        ativo: true,
        updated_at: activationSentAt
      })
      .eq("id", usuarioId)
      .eq("empresa_id", empresaId);

    if (profileUpdateError) {
      if (emailChanged) {
        const rollback = await adminClient.auth.admin.updateUserById(authUserId, { email: email(authUser.email) });
        if (rollback.error) {
          await writeAudit(adminClient, { operatorId, empresaId, usuarioId, authUserId, action: "change_email_and_reactivate", status: "error", previousEmail, targetEmail, previousStatus, error: `profile_update_failed;rollback_failed:${rollback.error.message}` });
          return jsonResponse(500, { success: false, error: "activation_rollback_failed" });
        }
      }
      await writeAudit(adminClient, { operatorId, empresaId, usuarioId, authUserId, action: emailChanged ? "change_email_and_reactivate" : action, status: "error", previousEmail, targetEmail, previousStatus, error: profileUpdateError.message });
      return jsonResponse(500, { success: false, error: "profile_update_failed" });
    }

    const auditError = await writeAudit(adminClient, { operatorId, empresaId, usuarioId, authUserId, action: emailChanged ? "change_email_and_reactivate" : action, status: "success", previousEmail, targetEmail, previousStatus, nextStatus });
    if (auditError) {
      return jsonResponse(500, { success: false, error: "audit_failed" });
    }

    return jsonResponse(200, {
      success: true,
      data: {
        usuarioId,
        authUserId,
        email: targetEmail,
        status: nextStatus,
        emailChanged,
        delivery: "smtp_accepted"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unexpected_error";
    await writeAudit(adminClient, {
      operatorId,
      empresaId,
      usuarioId,
      authUserId,
      action,
      status: "error",
      previousEmail,
      targetEmail,
      previousStatus,
      error: message
    });
    return jsonResponse(500, { success: false, error: "reactivation_failed", message });
  }
});
