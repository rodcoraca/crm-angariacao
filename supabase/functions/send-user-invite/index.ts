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
    console.error("RETURN", { stage, status, body });
  } else {
    console.log("RETURN", { stage, status, body });
  }

  return response(status, body);
}

type AuthAdminUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
};

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

async function findAuthUserByEmail(adminClient: any, email: string) {
  const targetEmail = normalizeEmail(email);
  if (!targetEmail) {
    return null;
  }

  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const users = (data?.users || []) as AuthAdminUser[];
    const found = users.find((item) => normalizeEmail(item?.email) === targetEmail) || null;
    if (found) {
      return found;
    }

    if (!users.length || !data?.nextPage) {
      break;
    }

    page = data.nextPage;
  }

  return null;
}

Deno.serve(async (req: Request) => {
  // PRE-FLIGHT
  if (req.method === "OPTIONS") {
    console.log("OPTIONS REQUEST", { method: req.method });
    return new Response(
      "ok",
      {
        status: 200,
        headers: corsHeaders
      }
    );
  }

  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      console.error("RUNTIME VALIDATION", {
        supabaseUrlExists: Boolean(supabaseUrl),
        serviceRoleKeyExists: Boolean(serviceRoleKey)
      });

      return logAndRespond("missing_runtime_secrets", 500, {
        success: false,
        error:
          "missing_runtime_secrets"
      });
    }

    console.log("RUNTIME VALIDATION", {
      supabaseUrlExists: Boolean(supabaseUrl),
      serviceRoleKeyExists: Boolean(serviceRoleKey)
    });

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

    const authHeader =
      req.headers.get(
        "Authorization"
      );

    console.log("AUTH HEADER RECEIVED", {
      hasAuthorization: Boolean(authHeader)
    });

    if (!authHeader) {
      return logAndRespond("missing_authorization", 401, {
        success: false,
        error:
          "missing_authorization"
      });
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
      console.error("INVALID TOKEN", {
        authError,
        hasUser: Boolean(authUser?.user)
      });

      return logAndRespond("invalid_token", 401, {
        success: false,
        error: "invalid_token",
        details: authError || null
      });
    }

    let body: Record<string, unknown>;
    try {
      body =
        await req.json();
    } catch (payloadError) {
      console.error("INVALID PAYLOAD", payloadError);
      return logAndRespond("invalid_payload", 400, {
        success: false,
        error: "invalid_payload",
        details: payloadError instanceof Error
          ? payloadError.message
          : String(payloadError)
      });
    }

    console.log("REQUEST BODY", body);

    const email = normalizeEmail(body.email);

    const action = String(body.action || "invite").trim().toLowerCase();

    const redirectTo =
      body.redirectTo;

    console.log("EMAIL", email);
    console.log("REDIRECT", redirectTo);

    if (
      redirectTo !== undefined &&
      redirectTo !== null &&
      typeof redirectTo !== "string"
    ) {
      return logAndRespond("invalid_payload_redirect", 400, {
        success: false,
        error: "invalid_payload",
        details: {
          field: "redirectTo",
          expected: "string",
          received: typeof redirectTo
        }
      });
    }

    if (!email) {
      return logAndRespond("missing_email", 400, {
        success: false,
        error:
          "missing_email"
      });
    }

    const existingUser = await findAuthUserByEmail(admin, email);
    const emailConfirmed = Boolean(existingUser?.email_confirmed_at);

    if (action === "status") {
      return logAndRespond("status", 200, {
        success: true,
        alreadyExists: Boolean(existingUser),
        emailConfirmed,
        data: {
          user: existingUser
            ? {
                id: existingUser.id,
                email: existingUser.email,
                email_confirmed_at: existingUser.email_confirmed_at || null
              }
            : null
        }
      });
    }

    if (existingUser && emailConfirmed) {
      return logAndRespond("existing_user_confirmed", 200, {
        success: true,
        alreadyExists: true,
        emailConfirmed: true,
        inviteSent: false,
        data: {
          user: {
            id: existingUser.id,
            email: existingUser.email,
            email_confirmed_at: existingUser.email_confirmed_at || null
          }
        }
      });
    }

    if (existingUser && !emailConfirmed) {
      const generated = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: redirectTo ? { redirectTo: String(redirectTo) } : undefined
      });

      if (generated.error) {
        return logAndRespond("invite_generate_link_error", Number(generated.error.status || 500), {
          success: false,
          error: generated.error.message,
          details: generated.error
        });
      }

      return logAndRespond("invite_regenerated", 200, {
        success: true,
        alreadyExists: true,
        emailConfirmed: false,
        inviteSent: true,
        data: {
          user: {
            id: existingUser.id,
            email: existingUser.email,
            email_confirmed_at: existingUser.email_confirmed_at || null
          },
          generatedLink: generated.data?.properties?.action_link || null
        }
      });
    }

    const {
      data,
      error
    } =
      await admin.auth.admin
        .inviteUserByEmail(
          email,
          redirectTo
            ? {
                redirectTo
              }
            : undefined
        );

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
          authError.status || 500
        );

      return logAndRespond(
        "invite_error",
        status,
        {
          success: false,
          error:
            authError.message,
          details: authError
        }
      );
    }

    return logAndRespond("invite_success", 200, {
      success: true,
      alreadyExists: false,
      emailConfirmed: false,
      inviteSent: true,
      data
    });

  } catch (e) {
    console.error("UNHANDLED ERROR", e);

    return logAndRespond("unhandled_exception", 500, {
      success: false,
      error:
        e instanceof Error
          ? e.message
          : "unexpected_error",
      details: e
    });
  }
});