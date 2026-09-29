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

async function hasUsersEditPermission(adminClient: any, operatorId: string, empresaId: string) {
  const { data: operatorProfile, error: operatorError } = await adminClient
    .from("usuarios")
    .select("id,empresa_id")
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

  const roleIds = (roleRows || []).map((row: { role_id?: string }) => row.role_id).filter(Boolean);
  if (!roleIds.length) return false;

  const { data: permissionRows, error: permissionError } = await adminClient
    .from("role_permissions")
    .select("permissions!inner(code,is_active)")
    .in("role_id", roleIds);

  if (permissionError) throw permissionError;

  return (permissionRows || []).some((row: any) =>
    row.permissions?.is_active !== false && row.permissions?.code === "users.edit"
  );
}

async function writeSecurityAudit(adminClient: any, {
  operatorId,
  empresaId,
  usuarioId,
  action,
  error
}: {
  operatorId: string;
  empresaId?: string | null;
  usuarioId?: string | null;
  action: string;
  error: string;
}) {
  await adminClient.from("audit_logs").insert([{
    user_id: operatorId,
    empresa_id: empresaId || null,
    modulo: "users",
    entidade: "usuarios",
    entidade_id: usuarioId || null,
    event_type: "update",
    status: "denied",
    metadata: { action, error },
    created_at: new Date().toISOString()
  }]);
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

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      console.error(
        "RUNTIME VALIDATION",
        {
          supabaseUrlExists:
            Boolean(supabaseUrl),

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

        serviceRoleKeyExists:
          Boolean(serviceRoleKey)
      }
    );

    // -------------------------------------------------------
    // ADMIN CLIENT
    // -------------------------------------------------------
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
      await admin.auth.getUser(
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

    if (usuarioId) {
      const targetEmpresaId = normalizeEmail(profile?.empresa_id);
      const operatorProfile = targetEmpresaId
        ? await admin
          .from("usuarios")
          .select("id,empresa_id")
          .eq("auth_user_id", authUser.user.id)
          .eq("empresa_id", targetEmpresaId)
          .maybeSingle()
        : { data: null, error: null };

      if (operatorProfile.error || !operatorProfile.data) {
        await writeSecurityAudit(admin, {
          operatorId: authUser.user.id,
          empresaId: targetEmpresaId || null,
          usuarioId,
          action: "send_user_invite",
          error: "tenant_access_denied"
        });
        return logAndRespond("tenant_access_denied", 403, {
          success: false,
          error: "tenant_access_denied"
        });
      }

      if (!(await hasUsersEditPermission(admin, authUser.user.id, targetEmpresaId))) {
        await writeSecurityAudit(admin, {
          operatorId: authUser.user.id,
          empresaId: targetEmpresaId,
          usuarioId,
          action: "send_user_invite",
          error: "permission_denied"
        });
        return logAndRespond("permission_denied", 403, {
          success: false,
          error: "permission_denied"
        });
      }

      if (!profile.auth_user_id) {
        await writeSecurityAudit(admin, {
          operatorId: authUser.user.id,
          empresaId: targetEmpresaId,
          usuarioId,
          action: "send_user_invite",
          error: "missing_auth_user_id"
        });
        return logAndRespond("missing_auth_user_id", 409, {
          success: false,
          error: "missing_auth_user_id"
        });
      }
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
    const action =
      String(
        body.action ||
          "invite"
      )
        .trim()
        .toLowerCase();

    if (action === "update_email") {
      const nextEmail = normalizeEmail(body.newEmail || body.email);
      if (!existingUser?.id || !nextEmail) {
        return logAndRespond("missing_email_update_context", 400, {
          success: false,
          error: "missing_email_update_context"
        });
      }

      if (profile?.empresa_id) {
        const { data: callerProfile, error: callerProfileError } = await admin
          .from("usuarios")
          .select("id")
          .eq("auth_user_id", authUser.user.id)
          .eq("empresa_id", profile.empresa_id)
          .maybeSingle();
        if (callerProfileError || !callerProfile) {
          return logAndRespond("tenant_access_denied", 403, {
            success: false,
            error: "tenant_access_denied"
          });
        }

        const { data: roleRows, error: roleError } = await admin
          .from("user_roles")
          .select("role_id,empresa_id")
          .eq("user_id", authUser.user.id)
          .or(`empresa_id.is.null,empresa_id.eq.${profile.empresa_id}`);
        if (roleError) throw roleError;

        const roleIds = (roleRows || []).map((row: { role_id?: string }) => row.role_id).filter(Boolean);
        const { data: permissionRows, error: permissionError } = roleIds.length
          ? await admin.from("role_permissions").select("permissions!inner(code,is_active)").in("role_id", roleIds)
          : { data: [], error: null };
        if (permissionError) throw permissionError;

        const canEditUsers = (permissionRows || []).some((row: any) =>
          row.permissions?.is_active !== false && row.permissions?.code === "users.edit"
        );
        if (!canEditUsers) {
          return logAndRespond("permission_denied", 403, {
            success: false,
            error: "permission_denied"
          });
        }
      }

      const { data, error } = await admin.auth.admin.updateUserById(existingUser.id, {
        email: nextEmail
      });
      if (error) throw error;

      return logAndRespond("email_updated", 200, {
        success: true,
        data: { user: data?.user || null }
      });
    }

    if (
      action === "status"
    ) {
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
    const inviteOptions = {
      ...(redirectTo
        ? {
            redirectTo:
              String(
                redirectTo
              )
          }
        : {}),

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
          redirectTo ||
          null
      }
    );

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
    console.error(
      "UNHANDLED ERROR",
      e
    );

    return logAndRespond(
      "unhandled_exception",
      500,
      {
        success: false,

        inviteSent:
          false,

        error:
          e instanceof Error
            ? e.message
            : "unexpected_error",

        details:
          e
      }
    );
  }
});