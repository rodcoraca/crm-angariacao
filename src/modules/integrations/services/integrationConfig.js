const INTEGRATION_STORAGE_KEY = "osflow_integrations_config";

const DEFAULT_OLX_CALLBACK_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/integrations/callback`
    : "https://app.osflow.pt/integrations/callback";

function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function safeIso(value, fallback = "") {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
}

function readStorage() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(INTEGRATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStorage(value) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(INTEGRATION_STORAGE_KEY, JSON.stringify(value));
}

function mergeOlxConfig(base = {}, overrides = {}) {
  const accessToken = safeText(
    overrides.accessToken ?? overrides.access_token ?? base.accessToken ?? base.access_token ?? process.env.REACT_APP_OLX_ACCESS_TOKEN,
    ""
  );
  const refreshToken = safeText(
    overrides.refreshToken ?? overrides.refresh_token ?? base.refreshToken ?? base.refresh_token ?? process.env.REACT_APP_OLX_REFRESH_TOKEN,
    ""
  );
  const expiresAt = safeIso(
    overrides.expiresAt ?? overrides.expires_at ?? base.expiresAt ?? base.expires_at ?? process.env.REACT_APP_OLX_TOKEN_EXPIRES_AT,
    ""
  );

  return {
    clientId: safeText(overrides.clientId ?? base.clientId ?? process.env.REACT_APP_OLX_CLIENT_ID, ""),
    clientSecret: safeText(
      overrides.clientSecret ?? base.clientSecret ?? process.env.REACT_APP_OLX_CLIENT_SECRET,
      ""
    ),
    accessToken,
    refreshToken,
    expiresAt,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    scope: safeText(overrides.scope ?? base.scope ?? process.env.REACT_APP_OLX_SCOPE ?? "v2 read write", "v2 read write"),
    redirectUri: safeText(
      overrides.redirectUri ?? base.redirectUri ?? process.env.REACT_APP_OLX_REDIRECT_URI ?? DEFAULT_OLX_CALLBACK_URL,
      DEFAULT_OLX_CALLBACK_URL
    ),
    state: safeText(overrides.state ?? base.state ?? "", ""),
    tokenType: safeText(overrides.tokenType ?? base.tokenType ?? "bearer", "bearer")
  };
}

export function getDefaultOlxCallbackUrl() {
  return DEFAULT_OLX_CALLBACK_URL;
}

export function loadIntegrationConfig() {
  return readStorage();
}

export function saveIntegrationConfig(config = {}) {
  const nextConfig = {
    ...readStorage(),
    ...config
  };

  writeStorage(nextConfig);
  return nextConfig;
}

export function loadOlxIntegrationConfig() {
  const current = readStorage();
  return mergeOlxConfig(current.olx || {}, current.olx || {});
}

export function saveOlxIntegrationConfig(partial = {}) {
  const current = readStorage();
  const nextOlx = mergeOlxConfig(current.olx || {}, partial);

  const nextConfig = {
    ...current,
    olx: nextOlx
  };

  writeStorage(nextConfig);
  return nextOlx;
}

export function clearOlxIntegrationState() {
  const current = readStorage();
  const nextOlx = {
    ...mergeOlxConfig(current.olx || {}),
    state: ""
  };

  const nextConfig = {
    ...current,
    olx: nextOlx
  };

  writeStorage(nextConfig);
  return nextOlx;
}

export function isOlxAccessTokenExpired(expiresAt) {
  if (!expiresAt) return false;

  const timestamp = new Date(expiresAt).getTime();
  if (!Number.isFinite(timestamp)) return false;

  return Date.now() >= timestamp - 30000;
}

export function updateOlxTokenState(tokenState = {}) {
  const current = loadOlxIntegrationConfig();
  return saveOlxIntegrationConfig({
    ...current,
    accessToken: tokenState.accessToken ?? current.accessToken,
    refreshToken: tokenState.refreshToken ?? current.refreshToken,
    expiresAt: tokenState.expiresAt ?? current.expiresAt,
    tokenType: tokenState.tokenType ?? current.tokenType,
    scope: tokenState.scope ?? current.scope
  });
}

export function buildOlxOAuthState() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `olx-${Math.random().toString(36).slice(2, 12)}`;
}
