import { supabase } from "../../../supabase";

const USER_SESSIONS_TABLE = "user_sessions";
const ACTIVE_SESSION_ID_KEY = "osflow_active_session_id";
const ACTIVE_SESSION_USER_KEY = "osflow_active_session_user_id";
const ACTIVE_SESSION_TENANT_KEY = "osflow_active_session_empresa_id";

let isTrackingStarted = false;
let trackerLastFlushAt = 0;

function nowIso() {
  return new Date().toISOString();
}

function getNavigatorUserAgent() {
  return typeof navigator !== "undefined" ? navigator.userAgent || null : null;
}

function detectDevice(userAgent) {
  const ua = String(userAgent || "").toLowerCase();

  if (!ua) return "unknown";
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) return "mobile";
  if (ua.includes("ipad") || ua.includes("tablet")) return "tablet";
  return "desktop";
}

function getStoredSessionId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_SESSION_ID_KEY);
}

function storeSessionContext({ sessionId, userId, empresaId }) {
  if (typeof window === "undefined") return;

  if (sessionId) {
    window.localStorage.setItem(ACTIVE_SESSION_ID_KEY, String(sessionId));
  }

  if (userId) {
    window.localStorage.setItem(ACTIVE_SESSION_USER_KEY, String(userId));
  }

  if (empresaId) {
    window.localStorage.setItem(ACTIVE_SESSION_TENANT_KEY, String(empresaId));
  }
}

function clearSessionContext() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
  window.localStorage.removeItem(ACTIVE_SESSION_USER_KEY);
  window.localStorage.removeItem(ACTIVE_SESSION_TENANT_KEY);
}

async function fetchClientIpAddress() {
  // Mantem dependencia zero no frontend; IP real deve ser enriquecido no backend/gateway quando aplicavel.
  return null;
}

async function terminatePreviousSessions({ userId, empresaId, reason = "new_login" }) {
  if (!userId) return { ok: false, reason: "missing_user" };

  const payload = {
    status: "terminated",
    logout_at: nowIso(),
    updated_at: nowIso(),
    metadata: {
      terminated_reason: reason
    }
  };

  let query = supabase
    .from(USER_SESSIONS_TABLE)
    .update(payload)
    .eq("user_id", userId)
    .eq("status", "active");

  if (empresaId) {
    query = query.eq("empresa_id", empresaId);
  }

  const { error } = await query;
  return { ok: !error, error };
}

async function createSessionRecord(context = {}) {
  const loginAt = nowIso();
  const userAgent = context.userAgent || getNavigatorUserAgent();
  const ipAddress = context.ipAddress || (await fetchClientIpAddress());

  const payload = {
    user_id: context.userId || null,
    empresa_id: context.empresaId || null,
    ip_address: ipAddress,
    user_agent: userAgent,
    device: context.device || detectDevice(userAgent),
    login_at: loginAt,
    last_activity_at: loginAt,
    logout_at: null,
    status: "active",
    created_at: loginAt,
    updated_at: loginAt
  };

  const { data, error } = await supabase
    .from(USER_SESSIONS_TABLE)
    .insert([payload])
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error, data: null };

  const sessionId = data?.id || null;
  storeSessionContext({
    sessionId,
    userId: context.userId || null,
    empresaId: context.empresaId || null
  });

  return { ok: true, sessionId, data };
}

function bindActivityTracking(context = {}) {
  if (typeof window === "undefined" || isTrackingStarted) return;

  const flushActivity = async () => {
    const sessionId = getStoredSessionId();
    if (!sessionId) return;

    const now = Date.now();
    if (now - trackerLastFlushAt < 30000) return;

    trackerLastFlushAt = now;
    await updateSessionActivity({ sessionId, userId: context.userId || null });
  };

  const events = ["click", "keydown", "mousemove", "scroll", "touchstart"];
  events.forEach((eventName) => {
    window.addEventListener(eventName, flushActivity, { passive: true });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      flushActivity();
    }
  });

  window.addEventListener("beforeunload", () => {
    const sessionId = getStoredSessionId();
    if (!sessionId) return;

    // Best effort only: o encerramento formal e garantido ocorre no logout explicito.
    navigator.sendBeacon?.("/noop", "");
  });

  isTrackingStarted = true;
}

export async function registerUserSession(context = {}) {
  if (!context.userId) return { ok: false, reason: "missing_user" };

  await terminatePreviousSessions({
    userId: context.userId,
    empresaId: context.empresaId || null,
    reason: "new_login"
  });

  const created = await createSessionRecord(context);
  if (created.ok) {
    bindActivityTracking(context);
  }

  return created;
}

export async function updateSessionActivity(context = {}) {
  const sessionId = context.sessionId || getStoredSessionId();
  if (!sessionId) return { ok: false, reason: "missing_session" };

  const { error } = await supabase
    .from(USER_SESSIONS_TABLE)
    .update({
      last_activity_at: nowIso(),
      updated_at: nowIso()
    })
    .eq("id", sessionId)
    .eq("status", "active");

  return { ok: !error, error };
}

export async function finalizeUserSession(context = {}) {
  const sessionId = context.sessionId || getStoredSessionId();

  if (sessionId) {
    const { error } = await supabase
      .from(USER_SESSIONS_TABLE)
      .update({
        status: "logged_out",
        logout_at: nowIso(),
        updated_at: nowIso()
      })
      .eq("id", sessionId)
      .eq("status", "active");

    clearSessionContext();
    return { ok: !error, error };
  }

  if (!context.userId) {
    clearSessionContext();
    return { ok: false, reason: "missing_user" };
  }

  let query = supabase
    .from(USER_SESSIONS_TABLE)
    .update({
      status: "logged_out",
      logout_at: nowIso(),
      updated_at: nowIso()
    })
    .eq("user_id", context.userId)
    .eq("status", "active");

  if (context.empresaId) {
    query = query.eq("empresa_id", context.empresaId);
  }

  const { error } = await query;
  clearSessionContext();
  return { ok: !error, error };
}
