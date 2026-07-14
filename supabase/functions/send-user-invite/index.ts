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

Deno.serve(async (req) => {
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

    const email =
      String(
        body.email || ""
      )
      .trim()
      .toLowerCase();

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

    const users =
      await admin.auth.admin.listUsers();

    const existingUser =
      users.data.users.find(
        user =>
          user.email?.toLowerCase()
          === email.toLowerCase()
      );

    if (existingUser) {
      return logAndRespond(
        "existing_user",
        200,
        {
          success: true,
          alreadyExists: true,
          data: {
            user: {
              id: existingUser.id,
              email: existingUser.email
            }
          }
        }
      );
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

  if (
    authError.code === "email_exists"
    || authError.status === 422
  ) {
    return logAndRespond(
      "invite_email_exists",
      200,
      {
        success: true,
        alreadyExists: true,
        data: {
          user: null
        }
      }
    );
  }

  //
  // UTILIZADOR JÁ EXISTE
  //
  if (
    authError.code ===
      "email_exists" ||
    authError.status === 422
  ) {
    console.warn(
      "EMAIL ALREADY EXISTS",
      email
    );

    return logAndRespond(
      "invite_email_exists",
      200,
      {
        success: true,
        alreadyExists: true,
        email
      }
    );
  }

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