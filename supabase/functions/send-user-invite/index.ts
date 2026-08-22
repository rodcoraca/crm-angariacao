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
    if (!email) {
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
    const existingUser =
      await findAuthUserByEmail(
        admin,
        email
      );

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
          email,
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