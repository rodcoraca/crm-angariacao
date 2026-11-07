import { createClient } from "npm:@supabase/supabase-js";
import ipaddr from "npm:ipaddr.js";

const defaultCorsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const allowedOrigins = new Set([
  "https://app.osflow.pt",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:4173",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:5173",
  "https://127.0.0.1:3000",
  "https://127.0.0.1:3001",
  "https://127.0.0.1:4173",
  "https://127.0.0.1:5173"
]);

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const MAX_USERNAME_LENGTH = 120;
const MAX_PASSWORD_LENGTH = 128;

function jsonResponse(status: number, body: Record<string, unknown>, responseHeaders = defaultCorsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...defaultCorsHeaders,
      ...responseHeaders
    }
  });
}

function normalizeUsername(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizePassword(value: unknown) {
  return String(value ?? "");
}

function getRequestOrigin(request: Request) {
  return request.headers.get("origin") || request.headers.get("Origin") || "";
}

function isAllowedOrigin(origin: string) {
  return Boolean(origin) && allowedOrigins.has(origin);
}

function resolveCorsHeaders(request: Request) {
  const origin = getRequestOrigin(request);

  if (!isAllowedOrigin(origin)) {
    return { ...defaultCorsHeaders };
  }

  return {
    ...defaultCorsHeaders,
    "Access-Control-Allow-Origin": origin
  };
}

function canonicalizeIpAddress(value: string): string | null {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.includes(",") || normalized.includes(" ") || normalized.includes("/")) {
    return null;
  }

  try {
    const parsed = ipaddr.parse(normalized);
    return parsed.toNormalizedString ? parsed.toNormalizedString() : parsed.toString();
  } catch {
    return null;
  }
}

function isValidIpAddress(value: string) {
  return Boolean(canonicalizeIpAddress(value));
}

function getClientIp(request: Request): string | null {
  const cfConnectingIp = request.headers.get("cf-connecting-ip") || "";
  const normalized = String(cfConnectingIp).trim();

  if (!normalized || normalized.includes(",") || !isValidIpAddress(normalized)) {
    return null;
  }

  return canonicalizeIpAddress(normalized);
}

async function createHmacBucketKey(type: "ip" | "username", rawValue: string, secret: string) {
  const value = type === "ip" ? canonicalizeIpAddress(rawValue) ?? "" : String(rawValue ?? "").trim().toLowerCase();
  const material = `${type}:${value}`;
  const keyBytes = new TextEncoder().encode(secret.trim());
  const valueBytes = new TextEncoder().encode(material);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const digest = await crypto.subtle.sign("HMAC", cryptoKey, valueBytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isValidUsername(username: unknown) {
  const normalized = normalizeUsername(username);
  return normalized.length >= 3 && normalized.length <= MAX_USERNAME_LENGTH && /^[a-z0-9._-]+$/.test(normalized);
}

function isValidPassword(password: unknown) {
  const value = normalizePassword(password);
  return value.length >= 8 && value.length <= MAX_PASSWORD_LENGTH;
}

async function evaluateRateLimit(adminClient: any, bucketType: string, bucketKey: string) {
  if (!bucketType || !bucketKey) {
    return { blocked: true, attempts: RATE_LIMIT_MAX_ATTEMPTS, unavailable: true };
  }

  try {
    const { data, error } = await adminClient.rpc("check_and_increment_login_attempt", {
      p_bucket_type: bucketType,
      p_bucket_key: bucketKey,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      p_limit: RATE_LIMIT_MAX_ATTEMPTS
    });

    if (error) {
      throw error;
    }

    const record = Array.isArray(data) ? data[0] : data;
    if (!record || typeof record.is_blocked !== "boolean") {
      throw new Error("invalid rate limit response");
    }

    return {
      blocked: Boolean(record.is_blocked),
      attempts: Number(record.attempts || 0),
      unavailable: false
    };
  } catch {
    return {
      blocked: true,
      attempts: RATE_LIMIT_MAX_ATTEMPTS,
      unavailable: true
    };
  }
}

async function resolveEmailFromUsername(adminClient: any, username: string) {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return null;
  }

  const { data, error } = await adminClient
    .from("usuarios")
    .select("email, username")
    .eq("username", normalized)
    .limit(2);

  if (error) {
    throw error;
  }

  const matches = Array.isArray(data)
    ? data.filter((row) => String(row?.username ?? "").trim().toLowerCase() === normalized)
    : [];

  if (matches.length !== 1) {
    return null;
  }

  const email = String(matches[0]?.email || "").trim().toLowerCase();
  return email || null;
}

Deno.serve(async (request) => {
  const headers = resolveCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { status: "error", code: "method_not_allowed" }, headers);
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const username = normalizeUsername(payload?.username);
    const password = normalizePassword(payload?.password);
    const ip = getClientIp(request);

    if (!isValidUsername(username) || !isValidPassword(password)) {
      return jsonResponse(400, {
        status: "error",
        code: "invalid_payload",
        message: "Credenciais inválidas."
      }, headers);
    }

    if (!ip) {
      return jsonResponse(503, {
        status: "error",
        code: "rate_limit_unavailable",
        message: "Autenticação indisponível no momento."
      }, headers);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const rateLimitHmacSecret = Deno.env.get("LOGIN_USERNAME_RATE_LIMIT_HMAC_SECRET");

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !rateLimitHmacSecret || rateLimitHmacSecret.trim().length < 16) {
      return jsonResponse(503, {
        status: "error",
        code: "rate_limit_unavailable",
        message: "Autenticação indisponível no momento."
      }, headers);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const ipBucketKey = await createHmacBucketKey("ip", ip, rateLimitHmacSecret);
    const usernameBucketKey = await createHmacBucketKey("username", username, rateLimitHmacSecret);

    const ipLimitState = await evaluateRateLimit(adminClient, "ip", ipBucketKey);
    if (ipLimitState.unavailable) {
      return jsonResponse(503, {
        status: "error",
        code: "rate_limit_unavailable",
        message: "Autenticação indisponível no momento."
      }, headers);
    }
    if (ipLimitState.blocked) {
      return jsonResponse(429, {
        status: "error",
        code: "rate_limited",
        message: "Muitas tentativas. Tente novamente mais tarde."
      }, headers);
    }

    const usernameLimitState = await evaluateRateLimit(adminClient, "username", usernameBucketKey);
    if (usernameLimitState.unavailable) {
      return jsonResponse(503, {
        status: "error",
        code: "rate_limit_unavailable",
        message: "Autenticação indisponível no momento."
      }, headers);
    }
    if (usernameLimitState.blocked) {
      return jsonResponse(429, {
        status: "error",
        code: "rate_limited",
        message: "Muitas tentativas. Tente novamente mais tarde."
      }, headers);
    }

    const publicClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    let resolvedEmail: string | null = null;

    try {
      resolvedEmail = await resolveEmailFromUsername(adminClient, username);
    } catch {
      return jsonResponse(500, {
        status: "error",
        code: "technical_error",
        message: "Autenticação indisponível no momento."
      }, headers);
    }

    if (!resolvedEmail) {
      return jsonResponse(401, {
        status: "error",
        code: "invalid_credentials",
        message: "Credenciais inválidas."
      }, headers);
    }

    const { data: authData, error: authError } = await publicClient.auth.signInWithPassword({
      email: resolvedEmail,
      password
    });

    if (authError) {
      return jsonResponse(401, {
        status: "error",
        code: "invalid_credentials",
        message: "Credenciais inválidas."
      }, headers);
    }

    const session = authData?.session || null;
    const authUser = authData?.user || null;

    if (!session || !authUser) {
      return jsonResponse(401, {
        status: "error",
        code: "invalid_credentials",
        message: "Credenciais inválidas."
      }, headers);
    }

    return jsonResponse(200, {
      status: "success",
      user: {
        id: authUser.id
      },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in
      }
    }, headers);
  } catch {
    return jsonResponse(500, {
      status: "error",
      code: "technical_error",
      message: "Autenticação indisponível no momento."
    }, headers);
  }
});
