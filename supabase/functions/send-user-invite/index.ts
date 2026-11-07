import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
  "Content-Type": "application/json"
};

function response(
  status: number,
  body: Record<string, unknown>
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: corsHeaders
    }
  );
}

function logAndRespond(
  stage: string,
  status: number,
  body: Record<string, unknown>
) {
  if (status >= 400) {
    console.error("RETURN", {
      stage,
      status,
      body
    });
  } else {
    console.log("RETURN", {
      stage,
      status,
      body
    });
  }

  return response(status, body);
}

function normalizeEmail(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

const DEFAULT_ACTIVATION_REDIRECT = "https://app.osflow.pt/";
const PRODUCTION_REDIRECT_HOST = "app.osflow.pt";
const LOCAL_REDIRECT_HOSTS = new Set(["localhost", "127.0.0.1"]);
const LOCAL_REDIRECT_PORTS = new Set(["", "3000", "3001"]);

function isAllowedRedirect(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const protocol = url.protocol.toLowerCase();
    const port = url.port;

    if (url.username || url.password) return false;
    if (!["http:", "https:"].includes(protocol)) return false;

    if (hostname === PRODUCTION_REDIRECT_HOST) {
      return protocol === "https:" && (port === "" || port === "443");
    }

    return LOCAL_REDIRECT_HOSTS.has(hostname) && LOCAL_REDIRECT_PORTS.has(port);
  } catch (_error) {
    return false;
  }
}

function ensureActivationRedirect(value: unknown) {
  const redirectTo = String(value || "").trim() || DEFAULT_ACTIVATION_REDIRECT;
  if (!isAllowedRedirect(redirectTo)) {
    throw new Error("invalid_redirect");
  }

  const url = new URL(redirectTo);
  url.searchParams.set("activation", "1");
  return url.toString();
}

type AuthAdminUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
};

async function findAuthUserByEmail(
  adminClient: any,
  email: string
) {
  const targetEmail = normalizeEmail(email);

  if (!targetEmail) {
    return null;
  }

  let page = 1;
  const perPage = 200;

  for (;;) {
    const {
      data,
      error
    } =
      await adminClient.auth.admin.listUsers({
        page,
        perPage
      });

    if (error) {
      throw error;
    }

    const users =
      (data?.users || []) as AuthAdminUser[];

    const found =
      users.find(
        (item) =>
          normalizeEmail(item?.email) ===
          targetEmail
      ) || null;

    if (found) {
      return found;
    }

    if (
      !users.length ||
      !data?.nextPage
    ) {
      break;
    }

    page = data.nextPage;
  }

  return null;
}

async function findAuthUserById(adminClient: any, authUserId: string) {
  if (!authUserId) return null;

  const { data, error } = await adminClient.auth.admin.getUserById(authUserId);
  if (error) throw error;
  return data?.user || null;
}

type SupportedAuditAction = "invite" | "status" | "update_email";

const SUPPORTED_ACTIONS = new Set<SupportedAuditAction>([
  "invite",
  "status",
  "update_email"
]);

const INTERNAL_AUDIT_ACTIONS = new Set<string>([
  "resend_invite"
]);

function normalizeSupportedAction(action: unknown): SupportedAuditAction {
  const normalizedAction = String(action || "").trim().toLowerCase();
  if (!SUPPORTED_ACTIONS.has(normalizedAction as SupportedAuditAction)) {
    throw new Error("invalid_action");
  }

  return normalizedAction as SupportedAuditAction;
}

function normalizeAuditAction(action: unknown): string {
  const normalizedAction = String(action || "").trim().toLowerCase();
  if (
    SUPPORTED_ACTIONS.has(normalizedAction as SupportedAuditAction) ||
    INTERNAL_AUDIT_ACTIONS.has(normalizedAction)
  ) {
    return normalizedAction;
  }

  throw new Error("invalid_action");
}

export function resolvePermissionCode(action: string, usuarioId?: string | null, profile?: any | null) {
  if (action === "status") {
    return "users.view";
  }

  if (action === "update_email") {
    return "users.edit";
  }

  if (usuarioId || profile) {
    return "users.edit";
  }

  return "users.create";
}

export async function hasUsersPermission(adminClient: any, operatorId: string, empresaId: string, permissionCode: string) {
  if (!empresaId) {
    return false;
  }

  const { data: targetEmpresa, error: targetEmpresaError } = await adminClient
    .from("empresas")
    .select("id")
    .eq("id", empresaId)
    .maybeSingle();

  if (targetEmpresaError) {
    throw targetEmpresaError;
  }

  if (!targetEmpresa) {
    return false;
  }

  const { data: roleRows, error: roleError } = await adminClient
    .from("user_roles")
    .select("role_id,empresa_id,is_primary,roles!inner(code,is_active)")
    .eq("user_id", operatorId)
    .eq("is_primary", true)
    .or(`empresa_id.is.null,empresa_id.eq.${empresaId}`);

  if (roleError) {
    throw roleError;
  }

  const roleIds = (roleRows || [])
    .filter((row: any) => row.roles?.is_active !== false && row.roles?.code)
    .map((row: { role_id?: string }) => row.role_id)
    .filter(Boolean);

  if (!roleIds.length) {
    return false;
  }

  const { data: permissionRows, error: permissionError } = await adminClient
    .from("role_permissions")
    .select("permissions!inner(code,is_active)")
    .in("role_id", roleIds);

  if (permissionError) {
    throw permissionError;
  }

  return (permissionRows || []).some((row: any) =>
    row.permissions?.is_active !== false && row.permissions?.code === permissionCode
  );
}

async function hasUsersEditPermission(adminClient: any, operatorId: string, empresaId: string) {
  return hasUsersPermission(adminClient, operatorId, empresaId, "users.edit");
}

function resolveAuditEventType(action: string) {
  const normalizedAction = String(action || "").trim().toLowerCase();

  switch (normalizedAction) {
    case "status":
      return "read";
    case "update_email":
      return "update";
    case "invite":
    case "resend_invite":
      return "create";
    default:
      throw new Error("invalid_action");
  }
}

async function createPendingAuditRecord(adminClient: any, {
  operatorId,
  empresaId,
  usuarioId,
  action
}: {
  operatorId: string;
  empresaId?: string | null;
  usuarioId?: string | null;
  action: string;
}) {
  const normalizedAction = normalizeAuditAction(action);
  const payload: Record<string, unknown> = {
    user_id: operatorId,
    empresa_id: empresaId || null,
    modulo: "users",
    entidade: "usuarios",
    entidade_id: usuarioId || null,
    event_type: resolveAuditEventType(normalizedAction),
    status: "pending",
    metadata: {
      action: normalizedAction,
      result: "pending",
      error: null
    },
    created_at: new Date().toISOString()
  };

  const { data, error: insertError } = await adminClient
    .from("audit_logs")
    .insert([payload])
    .select("id")
    .single();

  if (insertError || !data?.id) {
    console.error("[send-user-invite] audit_write_failed", {
      action: normalizedAction,
      status: "pending"
    });
    throw new Error("audit_write_failed");
  }

  return data.id as string;
}

export async function finalizeAuditRecord(adminClient: any, {
  auditId,
  action,
  status,
  error
}: {
  auditId: string;
  action: string;
  status: "success" | "denied" | "error";
  error?: string | null;
}) {
  const normalizedAction = normalizeAuditAction(action);
  const { data: updatedRow, error: updateError } = await adminClient
    .from("audit_logs")
    .update({
      status,
      metadata: {
        action: normalizedAction,
        result: status,
        error: error || null
      }
    })
    .eq("id", auditId)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedRow?.id) {
    console.error("[send-user-invite] audit_update_failed", {
      auditId,
      action: normalizedAction,
      status,
      updateError: updateError ? updateError.message : "no_row_updated"
    });
    throw new Error("audit_update_failed");
  }
}

async function writeSecurityAudit(adminClient: any, {
  operatorId,
  empresaId,
  usuarioId,
  action,
  error,
  status = "denied"
}: {
  operatorId: string;
  empresaId?: string | null;
  usuarioId?: string | null;
  action: string;
  error?: string | null;
  status?: "success" | "denied" | "error";
}) {
  const auditId = await createPendingAuditRecord(adminClient, {
    operatorId,
    empresaId,
    usuarioId,
    action
  });

  await finalizeAuditRecord(adminClient, {
    auditId,
    action,
    status,
    error
  });
}

Deno.serve(async (req: Request) => {
  // ---------------------------------------------------------
  // PRE-FLIGHT
  // ---------------------------------------------------------
  if (req.method === "OPTIONS") {
    console.log(
      "OPTIONS REQUEST",
      {
        method: req.method
      }
    );

    return new Response(
      "ok",
      {
        status: 200,
        headers: corsHeaders
      }
    );
  }

  try {
    // -------------------------------------------------------
    // RUNTIME SECRETS
    // -------------------------------------------------------
    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL"
      );

    const supabaseAnonKey =
      Deno.env.get(
        "SUPABASE_ANON_KEY"
      ) || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey
    ) {
      console.error(
        "RUNTIME VALIDATION",
        {
          supabaseUrlExists:
            Boolean(supabaseUrl),

          supabaseAnonKeyExists:
            Boolean(supabaseAnonKey),

          serviceRoleKeyExists:
            Boolean(serviceRoleKey)
        }
      );

      return logAndRespond(
        "missing_runtime_secrets",
        500,
        {
          success: false,
          error:
            "missing_runtime_secrets"
        }
      );
    }

    console.log(
      "RUNTIME VALIDATION",
      {
        supabaseUrlExists:
          Boolean(supabaseUrl),

        supabaseAnonKeyExists:
          Boolean(supabaseAnonKey),

        serviceRoleKeyExists:
          Boolean(serviceRoleKey)
      }
    );

    // -------------------------------------------------------
    // ADMIN CLIENT
    // -------------------------------------------------------
    const authClient =
      createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

    const admin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

    // -------------------------------------------------------
    // AUTHORIZATION
    // -------------------------------------------------------
    const authHeader =
      req.headers.get(
        "Authorization"
      );

    console.log(
      "AUTH HEADER RECEIVED",
      {
        hasAuthorization:
          Boolean(authHeader)
      }
    );

    if (!authHeader) {
      return logAndRespond(
        "missing_authorization",
        401,
        {
          success: false,
          error:
            "missing_authorization"
        }
      );
    }

    const jwt =
      authHeader.replace(
        "Bearer ",
        ""
      );

    const {
      data: authUser,
      error: authError
    } =
      await authClient.auth.getUser(
        jwt
      );

    if (
      authError ||
      !authUser.user
    ) {
      console.error(
        "INVALID TOKEN",
        {
          authError,
          hasUser:
            Boolean(
              authUser?.user
            )
        }
      );

      return logAndRespond(
        "invalid_token",
        401,
        {
          success: false,
          error:
            "invalid_token",
          details:
            authError || null
        }
      );
    }

    // -------------------------------------------------------
    // REQUEST PAYLOAD
    // -------------------------------------------------------
    let body:
      Record<string, unknown>;

    try {
      body =
        await req.json();
    } catch (payloadError) {
      console.error(
        "INVALID PAYLOAD",
        payloadError
      );

      return logAndRespond(
        "invalid_payload",
        400,
        {
          success: false,
          error:
            "invalid_payload",
          details:
            payloadError instanceof Error
              ? payloadError.message
              : String(
                  payloadError
                )
        }
      );
    }

    console.log(
      "REQUEST BODY",
      body
    );

    const email =
      normalizeEmail(
        body.email
      );

    const usuarioId = String(body.usuarioId || "").trim();
    const authUserId = String(body.authUserId || "").trim();
    const empresaId = String(body.empresaId || "").trim();

    let action: SupportedAuditAction;
    try {
      action = normalizeSupportedAction(body.action ?? "invite");
    } catch (_error) {
      return logAndRespond("invalid_action", 400, {
        success: false,
        error: "invalid_action"
      });
    }

    const redirectTo =
      body.redirectTo;

    const nome =
      String(
        body.nome || ""
      ).trim();

    const username =
      String(
        body.username || ""
      ).trim();

    const empresa =
      String(
        body.empresa || ""
      ).trim();

    console.log(
      "EMAIL",
      email
    );

    console.log(
      "REDIRECT",
      redirectTo
    );

    // -------------------------------------------------------
    // VALIDATE REDIRECT
    // -------------------------------------------------------
    if (
      redirectTo !== undefined &&
      redirectTo !== null &&
      typeof redirectTo !==
        "string"
    ) {
      return logAndRespond(
        "invalid_payload_redirect",
        400,
        {
          success: false,
          error:
            "invalid_payload",
          details: {
            field:
              "redirectTo",
            expected:
              "string",
            received:
              typeof redirectTo
          }
        }
      );
    }

    // -------------------------------------------------------
    // VALIDATE EMAIL
    // -------------------------------------------------------
    if (!usuarioId && !authUserId && !email) {
      return logAndRespond(
        "missing_email",
        400,
        {
          success: false,
          error:
            "missing_email"
        }
      );
    }

    // -------------------------------------------------------
    // FIND EXISTING AUTH USER
    // -------------------------------------------------------
    let profile = null;
    if (usuarioId) {
      let profileQuery = admin
        .from("usuarios")
        .select("id,auth_user_id,email,empresa_id")
        .eq("id", usuarioId);
      const { data, error } = await profileQuery.maybeSingle();
      if (error) throw error;
      profile = data;
      if (!profile) {
        return logAndRespond("profile_not_found", 404, {
          success: false,
          error: "profile_not_found"
        });
      }
    }

    if (!usuarioId && !empresaId && email) {
      const { data: profileByEmail, error: profileByEmailError } = await admin
        .from("usuarios")
        .select("id,auth_user_id,email,empresa_id")
        .ilike("email", email)
        .maybeSingle();
      if (profileByEmailError) throw profileByEmailError;
      profile = profileByEmail;
    }

    const targetEmpresaId = String(profile?.empresa_id || empresaId || "").trim();
    if (profile?.empresa_id && empresaId && String(profile.empresa_id) !== empresaId) {
      await writeSecurityAudit(admin, {
        operatorId: authUser.user.id,
        empresaId: targetEmpresaId,
        usuarioId: usuarioId || profile?.id || null,
        action,
        error: "tenant_access_denied"
      });
      return logAndRespond("tenant_access_denied", 403, {
        success: false,
        error: "tenant_access_denied"
      });
    }

    if (!targetEmpresaId) {
      await writeSecurityAudit(admin, {
        operatorId: authUser.user.id,
        empresaId: null,
        usuarioId: usuarioId || profile?.id || null,
        action,
        error: "missing_empresa_id"
      });
      return logAndRespond("missing_empresa_id", 400, {
        success: false,
        error: "missing_empresa_id"
      });
    }

    const { data: targetEmpresa, error: targetEmpresaError } = await admin
      .from("empresas")
      .select("id")
      .eq("id", targetEmpresaId)
      .maybeSingle();

    if (targetEmpresaError) {
      throw targetEmpresaError;
    }

    if (!targetEmpresa) {
      await writeSecurityAudit(admin, {
        operatorId: authUser.user.id,
        empresaId: targetEmpresaId,
        usuarioId: usuarioId || profile?.id || null,
        action,
        error: "invalid_empresa_id"
      });
      return logAndRespond("invalid_empresa_id", 400, {
        success: false,
        error: "invalid_empresa_id"
      });
    }

    const permissionCode = resolvePermissionCode(action, usuarioId || null, profile || null);
    if (!(await hasUsersPermission(admin, authUser.user.id, targetEmpresaId, permissionCode))) {
      await writeSecurityAudit(admin, {
        operatorId: authUser.user.id,
        empresaId: targetEmpresaId,
        usuarioId: usuarioId || profile?.id || null,
        action,
        error: "permission_denied"
      });
      return logAndRespond("permission_denied", 403, {
        success: false,
        error: "permission_denied",
        requiredPermission: permissionCode
      });
    }

    if (usuarioId && (!profile || !profile.auth_user_id)) {
      await writeSecurityAudit(admin, {
        operatorId: authUser.user.id,
        empresaId: targetEmpresaId,
        usuarioId: usuarioId || profile?.id || null,
        action,
        error: "profile_not_found"
      });
      return logAndRespond("profile_not_found", 404, {
        success: false,
        error: "profile_not_found"
      });
    }

    const resolvedAuthUserId = usuarioId
      ? profile.auth_user_id
      : authUserId || "";
    const existingUser = resolvedAuthUserId
      ? await findAuthUserById(admin, resolvedAuthUserId)
      : await findAuthUserByEmail(admin, email);
    const effectiveEmail = normalizeEmail(existingUser?.email || profile?.email || email);

    if (!effectiveEmail) {
      return logAndRespond("missing_email", 400, {
        success: false,
        error: "missing_email"
      });
    }

    const emailConfirmed =
      Boolean(
        existingUser?.email_confirmed_at
      );
    const inviteAuditAction =
      action === "status" || action === "update_email"
        ? action
        : existingUser && !emailConfirmed
          ? "resend_invite"
          : "invite";

    console.log(
      "AUTH USER CHECK",
      {
        exists:
          Boolean(existingUser),

        emailConfirmed,

        userId:
          existingUser?.id ||
          null
      }
    );

    // -------------------------------------------------------
    // STATUS REQUEST
    // -------------------------------------------------------
    if (action === "update_email") {
      const nextEmail = normalizeEmail(body.newEmail || body.email);
      if (!existingUser?.id || !nextEmail) {
        await writeSecurityAudit(admin, {
          operatorId: authUser.user.id,
          empresaId: targetEmpresaId,
          usuarioId: existingUser?.id || usuarioId || profile?.id || null,
          action: "update_email",
          error: "missing_email_update_context"
        });
        return logAndRespond("missing_email_update_context", 400, {
          success: false,
          error: "missing_email_update_context"
        });
      }

      const auditId = await createPendingAuditRecord(admin, {
        operatorId: authUser.user.id,
        empresaId: targetEmpresaId,
        usuarioId: existingUser.id,
        action: "update_email"
      });

      const { data, error } = await admin.auth.admin.updateUserById(existingUser.id, {
        email: nextEmail
      });
      if (error) {
        await finalizeAuditRecord(admin, {
          auditId,
          action: "update_email",
          status: "error",
          error: error.message || "email_update_failed"
        });
        throw error;
      }

      await finalizeAuditRecord(admin, {
        auditId,
        action: "update_email",
        status: "success",
        error: null
      });

      return logAndRespond("email_updated", 200, {
        success: true,
        data: { user: data?.user || null }
      });
    }

    if (
      action === "status"
    ) {
      const auditId = await createPendingAuditRecord(admin, {
        operatorId: authUser.user.id,
        empresaId: targetEmpresaId,
        usuarioId: usuarioId || profile?.id || null,
        action: "status"
      });

      await finalizeAuditRecord(admin, {
        auditId,
        action: "status",
        status: "success",
        error: null
      });
      return logAndRespond(
        "status",
        200,
        {
          success: true,

          alreadyExists:
            Boolean(
              existingUser
            ),

          emailConfirmed,

          data: {
            user:
              existingUser
                ? {
                    id:
                      existingUser.id,

                    email:
                      existingUser.email,

                    email_confirmed_at:
                      existingUser.email_confirmed_at ||
                      null
                  }
                : null
          }
        }
      );
    }

    // -------------------------------------------------------
    // EXISTING CONFIRMED USER
    // -------------------------------------------------------
    //
    // A confirmed account must not receive an invitation.
    //
    if (
      existingUser &&
      emailConfirmed
    ) {
      const auditId = await createPendingAuditRecord(admin, {
        operatorId: authUser.user.id,
        empresaId: targetEmpresaId,
        usuarioId: existingUser.id,
        action: "status"
      });

      await finalizeAuditRecord(admin, {
        auditId,
        action: "status",
        status: "success",
        error: null
      });
      return logAndRespond(
        "existing_user_confirmed",
        200,
        {
          success: true,

          alreadyExists:
            true,

          emailConfirmed:
            true,

          inviteSent:
            false,

          data: {
            user: {
              id:
                existingUser.id,

              email:
                existingUser.email,

              email_confirmed_at:
                existingUser.email_confirmed_at ||
                null
            }
          }
        }
      );
    }

    // -------------------------------------------------------
    // INVITE / RE-INVITE
    // -------------------------------------------------------
    //
    // IMPORTANT:
    //
    // We deliberately DO NOT return merely because the user
    // already exists.
    //
    // inviteUserByEmail() is the Supabase operation that
    // actually sends the invitation email.
    //
    // For a new user:
    //   - creates the user
    //   - sends the invite
    //
    // For an existing user:
    //   - Supabase determines whether the invite can be sent
    //   - we return the actual result/error
    //
    let activationRedirectTo: string;
    try {
      activationRedirectTo = ensureActivationRedirect(redirectTo);
    } catch (_error) {
      await writeSecurityAudit(admin, {
        operatorId: authUser.user.id,
        empresaId: targetEmpresaId,
        usuarioId: usuarioId || profile?.id || null,
        action: inviteAuditAction,
        error: "invalid_redirect"
      });
      return logAndRespond("invalid_redirect", 400, {
        success: false,
        error: "invalid_redirect"
      });
    }

    const inviteOptions = {
      redirectTo: activationRedirectTo,

      data: {
        nome,
        username,
        empresa
      }
    };

    console.log(
      "INVITE REQUEST",
      {
        email,
        existingUser:
          Boolean(
            existingUser
          ),
        emailConfirmed,
        redirectTo:
          activationRedirectTo
      }
    );

    const inviteAuditId = await createPendingAuditRecord(admin, {
      operatorId: authUser.user.id,
      empresaId: targetEmpresaId,
      usuarioId: usuarioId || profile?.id || existingUser?.id || null,
      action: inviteAuditAction
    });

    const {
      data,
      error
    } =
      await admin.auth.admin
        .inviteUserByEmail(
          effectiveEmail,
          inviteOptions
        );

    // -------------------------------------------------------
    // INVITE ERROR
    // -------------------------------------------------------
    if (error) {
      console.error(
        "INVITE ERROR",
        error
      );

      const authError =
        error as {
          status?: number;
          code?: string;
          message?: string;
        };

      const status =
        Number(
          authError.status ||
            500
        );

      // -----------------------------------------------------
      // EXISTING USER
      // -----------------------------------------------------
      //
      // Do NOT report success.
      //
      // The email was not sent through inviteUserByEmail()
      // if Auth rejects the operation because the account
      // already exists.
      //
      if (
        authError.code ===
          "email_exists" ||
        status === 422
      ) {
        await finalizeAuditRecord(admin, {
          auditId: inviteAuditId,
          action: inviteAuditAction,
          status: "error",
          error: "existing_user"
        });
        return logAndRespond(
          "invite_existing_user_rejected",
          409,
          {
            success: false,

            alreadyExists:
              true,

            emailConfirmed,

            inviteSent:
              false,

            error:
              "existing_user",

            message:
              "O utilizador já existe no Supabase Auth e o convite não foi enviado.",

            data: {
              user:
                existingUser
                  ? {
                      id:
                        existingUser.id,

                      email:
                        existingUser.email,

                      email_confirmed_at:
                        existingUser.email_confirmed_at ||
                        null
                    }
                  : null
            }
          }
        );
      }

      // -----------------------------------------------------
      // OTHER AUTH ERROR
      // -----------------------------------------------------
      await finalizeAuditRecord(admin, {
        auditId: inviteAuditId,
        action: inviteAuditAction,
        status: "error",
        error: authError.message || "invite_error"
      });
      return logAndRespond(
        "invite_error",
        status,
        {
          success: false,

          alreadyExists:
            Boolean(
              existingUser
            ),

          emailConfirmed,

          inviteSent:
            false,

          error:
            authError.message ||
            "invite_error",

          details:
            authError
        }
      );
    }

    // -------------------------------------------------------
    // UPDATE METADATA FOR NEWLY CREATED USER
    // -------------------------------------------------------
    const invitedUserId =
      (data as any)
        ?.user?.id;

    if (
      invitedUserId &&
      (
        nome ||
        username ||
        empresa
      )
    ) {
      const {
        error:
          updateError
      } =
        await admin.auth.admin
          .updateUserById(
            invitedUserId,
            {
              user_metadata: {
                nome,
                username,
                empresa
              }
            }
          );

      if (
        updateError
      ) {
        console.error(
          "[send-user-invite] metadata_update_failed",
          {
            userId:
              invitedUserId,

            error:
              updateError.message
          }
        );
      }
    }

    // -------------------------------------------------------
    // SUCCESS
    // -------------------------------------------------------
    await finalizeAuditRecord(admin, {
      auditId: inviteAuditId,
      action: inviteAuditAction,
      status: "success",
      error: null
    });

    return logAndRespond(
      existingUser
        ? "invite_resent"
        : "invite_success",
      200,
      {
        success: true,

        alreadyExists:
          Boolean(
            existingUser
          ),

        emailConfirmed:
          false,

        inviteSent:
          true,

        data
      }
    );

  } catch (e) {
    const safeError =
      e instanceof Error && (
        e.message === "audit_write_failed" ||
        e.message === "audit_update_failed" ||
        e.message === "invalid_action"
      )
        ? e.message
        : "unexpected_error";

    console.error(
      "UNHANDLED ERROR",
      {
        error: safeError
      }
    );

    return logAndRespond(
      "unhandled_exception",
      500,
      {
        success: false,

        inviteSent:
          false,

        error:
          safeError
      }
    );
  }
});
