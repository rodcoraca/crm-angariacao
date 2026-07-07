import {
  buildOlxOAuthState,
  getDefaultOlxCallbackUrl,
  isOlxAccessTokenExpired,
  loadOlxIntegrationConfig,
  saveOlxIntegrationConfig,
  updateOlxTokenState
} from "./integrationConfig";

const OLX_AUTHORIZATION_URL = "https://www.olx.pt/oauth/authorize/";
const OLX_TOKEN_URL = "https://www.olx.pt/api/open/oauth/token";
const DEFAULT_SCOPE = "v2 read write";

function resolveFetchImpl(fetchImpl) {
  if (fetchImpl) return fetchImpl;
  if (typeof fetch !== "undefined") return fetch.bind(window);
  return null;
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function normalizeTokenResponse(payload, fallbackScope = DEFAULT_SCOPE) {
  const receivedAt = new Date();
  const expiresIn = Number(payload?.expires_in || 0);
  const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0
    ? new Date(receivedAt.getTime() + expiresIn * 1000).toISOString()
    : receivedAt.toISOString();

  return {
    accessToken: safeText(payload?.access_token, ""),
    refreshToken: safeText(payload?.refresh_token, ""),
    expiresAt,
    tokenType: safeText(payload?.token_type, "bearer").toLowerCase(),
    scope: safeText(payload?.scope, fallbackScope)
  };
}

function buildTokenRequestBody({ grantType, clientId, clientSecret, code, refreshToken, scope, redirectUri }) {
  const body = {
    grant_type: grantType,
    client_id: clientId,
    client_secret: clientSecret
  };

  if (scope) body.scope = scope;
  if (code) body.code = code;
  if (refreshToken) body.refresh_token = refreshToken;
  if (redirectUri) body.redirect_uri = redirectUri;

  return body;
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestOAuthToken(payload, fetchImpl) {
  const response = await fetchImpl(OLX_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Version: "2.0"
    },
    body: JSON.stringify(payload)
  });

  const responseBody = await parseJsonResponse(response);

  if (!response.ok) {
    const detail =
      responseBody?.error_description ||
      responseBody?.error?.detail ||
      responseBody?.error?.message ||
      responseBody?.message ||
      `OLX OAuth indisponível (${response.status}).`;

    throw new Error(detail);
  }

  return normalizeTokenResponse(responseBody);
}

export function buildOlxAuthorizationUrl({ clientId, redirectUri, state, scope = DEFAULT_SCOPE }) {
  const url = new URL(OLX_AUTHORIZATION_URL);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state || buildOlxOAuthState());
  url.searchParams.set("scope", scope);

  if (redirectUri) {
    url.searchParams.set("redirect_uri", redirectUri);
  }

  return url.toString();
}

export function getOlxDefaultRedirectUri() {
  return getDefaultOlxCallbackUrl();
}

export async function exchangeOlxAuthorizationCode({
  code,
  clientId,
  clientSecret,
  redirectUri,
  scope = DEFAULT_SCOPE,
  fetchImpl
}) {
  const resolvedFetchImpl = resolveFetchImpl(fetchImpl);

  if (!resolvedFetchImpl) {
    throw new Error("Fetch indisponível para concluir OAuth do OLX.");
  }

  const tokenResponse = await requestOAuthToken(
    buildTokenRequestBody({
      grantType: "authorization_code",
      clientId,
      clientSecret,
      code,
      scope,
      redirectUri
    }),
    resolvedFetchImpl
  );

  return updateOlxTokenState(tokenResponse);
}

export async function refreshOlxAccessToken({
  clientId,
  clientSecret,
  refreshToken,
  fetchImpl
}) {
  const resolvedFetchImpl = resolveFetchImpl(fetchImpl);

  if (!resolvedFetchImpl) {
    throw new Error("Fetch indisponível para renovar token do OLX.");
  }

  const tokenResponse = await requestOAuthToken(
    buildTokenRequestBody({
      grantType: "refresh_token",
      clientId,
      clientSecret,
      refreshToken
    }),
    resolvedFetchImpl
  );

  return updateOlxTokenState(tokenResponse);
}

export async function ensureOlxAccessToken({ fetchImpl } = {}) {
  const current = loadOlxIntegrationConfig();
  const resolvedFetchImpl = resolveFetchImpl(fetchImpl);

  if (!current.clientId || !current.clientSecret) {
    return current;
  }

  if (current.accessToken && !isOlxAccessTokenExpired(current.expiresAt)) {
    return current;
  }

  if (!current.refreshToken) {
    return current;
  }

  return refreshOlxAccessToken({
    clientId: current.clientId,
    clientSecret: current.clientSecret,
    refreshToken: current.refreshToken,
    fetchImpl: resolvedFetchImpl
  });
}

export async function completeOlxOAuthCallback({
  code,
  clientId,
  clientSecret,
  redirectUri,
  scope = DEFAULT_SCOPE,
  fetchImpl
}) {
  if (!code) {
    throw new Error("Código OAuth do OLX em falta.");
  }

  const credentials = {
    clientId: safeText(clientId, ""),
    clientSecret: safeText(clientSecret, ""),
    redirectUri: safeText(redirectUri, getDefaultOlxCallbackUrl()),
    scope: safeText(scope, DEFAULT_SCOPE)
  };

  const resolvedFetchImpl = resolveFetchImpl(fetchImpl);

  saveOlxIntegrationConfig(credentials);

  return exchangeOlxAuthorizationCode({
    code,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    redirectUri: credentials.redirectUri,
    scope: credentials.scope,
    fetchImpl: resolvedFetchImpl
  });
}

export function buildOlxOAuthUrlFromCurrentConfig(state) {
  const current = loadOlxIntegrationConfig();

  return buildOlxAuthorizationUrl({
    clientId: current.clientId,
    redirectUri: current.redirectUri || getDefaultOlxCallbackUrl(),
    state: state || buildOlxOAuthState(),
    scope: current.scope || DEFAULT_SCOPE
  });
}
