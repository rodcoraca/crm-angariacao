import { RadarProvider } from "./RadarProvider";
import { MockRadarProvider } from "./MockRadarProvider";
import {
  buildOlxAuthorizationUrl,
  completeOlxOAuthCallback,
  refreshOlxAccessToken
} from "../../integrations";
import {
  buildOlxOAuthState,
  isOlxAccessTokenExpired,
  loadOlxIntegrationConfig,
  saveOlxIntegrationConfig
} from "../../integrations";

const CONNECTION_STATES = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  TOKEN_EXPIRED: "token_expired"
};

const OLX_API_BASE_URL = "https://www.olx.pt";
const OLX_THREADS_PATH = "/api/partner/threads";

function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

async function parseResponseBody(response) {
  try {
    return await response.json();
  } catch {
    try {
      return await response.text();
    } catch {
      return null;
    }
  }
}

function resolveConnectionState(config) {
  if (!config?.accessToken) {
    return CONNECTION_STATES.DISCONNECTED;
  }

  if (isOlxAccessTokenExpired(config.expiresAt)) {
    return CONNECTION_STATES.TOKEN_EXPIRED;
  }

  return CONNECTION_STATES.CONNECTED;
}

function buildThreadsUrl(options = {}) {
  const base = options.baseUrl || OLX_API_BASE_URL;
  const path = options.path || OLX_THREADS_PATH;
  const url = new URL(`${base}${path}`);

  if (options.limit !== undefined) {
    url.searchParams.set("limit", String(options.limit));
  }

  if (options.offset !== undefined) {
    url.searchParams.set("offset", String(options.offset));
  }

  if (options.page !== undefined) {
    url.searchParams.set("page", String(options.page));
  }

  if (options.pageSize !== undefined) {
    url.searchParams.set("page_size", String(options.pageSize));
  }

  return url.toString();
}

export class OlxProvider extends RadarProvider {
  constructor(options = {}) {
    super();
    this.fetchImpl = options.fetchImpl || (typeof fetch !== "undefined" ? fetch.bind(window) : null);
    this.fallbackProvider = options.fallbackProvider || new MockRadarProvider();
  }

  getConnectionState() {
    return resolveConnectionState(loadOlxIntegrationConfig());
  }

  connect({ clientId, clientSecret, redirectUri, scope, state } = {}) {
    const current = loadOlxIntegrationConfig();

    const nextState = safeText(state, buildOlxOAuthState());
    const nextConfig = saveOlxIntegrationConfig({
      clientId: safeText(clientId, current.clientId),
      clientSecret: safeText(clientSecret, current.clientSecret),
      redirectUri: safeText(redirectUri, current.redirectUri),
      scope: safeText(scope, current.scope || "v2 read write"),
      state: nextState
    });

    if (!nextConfig.clientId) {
      throw new Error("Client ID do OLX em falta para iniciar OAuth.");
    }

    const authorizationUrl = buildOlxAuthorizationUrl({
      clientId: nextConfig.clientId,
      redirectUri: nextConfig.redirectUri,
      scope: nextConfig.scope,
      state: nextState
    });

    return {
      state: nextState,
      status: this.getConnectionState(),
      authorizationUrl
    };
  }

  async callback({ code, state, error, errorDescription, clientId, clientSecret, redirectUri, scope } = {}) {
    if (error) {
      throw new Error(safeText(errorDescription, `OLX OAuth error: ${error}`));
    }

    const current = loadOlxIntegrationConfig();
    const expectedState = safeText(current.state, "");
    const incomingState = safeText(state, "");

    if (expectedState && incomingState && expectedState !== incomingState) {
      throw new Error("O state OAuth do OLX nao corresponde ao esperado.");
    }

    const nextConfig = await completeOlxOAuthCallback({
      code: safeText(code, ""),
      clientId: safeText(clientId, current.clientId),
      clientSecret: safeText(clientSecret, current.clientSecret),
      redirectUri: safeText(redirectUri, current.redirectUri),
      scope: safeText(scope, current.scope || "v2 read write"),
      fetchImpl: this.fetchImpl
    });

    saveOlxIntegrationConfig({ state: "" });

    return {
      status: resolveConnectionState(nextConfig),
      access_token: nextConfig.accessToken || "",
      refresh_token: nextConfig.refreshToken || "",
      expires_at: nextConfig.expiresAt || ""
    };
  }

  async refreshToken() {
    const current = loadOlxIntegrationConfig();

    if (!current.clientId || !current.clientSecret) {
      throw new Error("Credenciais OLX em falta para refresh token.");
    }

    if (!current.refreshToken) {
      throw new Error("Refresh token do OLX em falta.");
    }

    const nextConfig = await refreshOlxAccessToken({
      clientId: current.clientId,
      clientSecret: current.clientSecret,
      refreshToken: current.refreshToken,
      fetchImpl: this.fetchImpl
    });

    return {
      status: resolveConnectionState(nextConfig),
      access_token: nextConfig.accessToken || "",
      refresh_token: nextConfig.refreshToken || "",
      expires_at: nextConfig.expiresAt || ""
    };
  }

  async getThreads(options = {}) {
    if (!this.fetchImpl) {
      throw new Error("Fetch indisponivel para comunicacao com OLX.");
    }

    let session = loadOlxIntegrationConfig();
    let status = resolveConnectionState(session);

    if (status === CONNECTION_STATES.TOKEN_EXPIRED && session.refreshToken) {
      await this.refreshToken();
      session = loadOlxIntegrationConfig();
      status = resolveConnectionState(session);
    }

    if (!session.accessToken) {
      throw new Error("Access token do OLX em falta.");
    }

    const response = await this.fetchImpl(buildThreadsUrl(options), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.accessToken}`,
        Version: "2.0"
      }
    });

    const raw = await parseResponseBody(response);

    if (!response.ok) {
      const detail =
        raw?.error?.detail ||
        raw?.error_description ||
        raw?.message ||
        `OLX API indisponivel (${response.status}).`;

      throw new Error(detail);
    }

    return {
      status,
      raw
    };
  }

  async listOpportunities() {
    // Sprint atual: provider OLX apenas valida autenticacao/comunicacao.
    return this.fallbackProvider.listOpportunities();
  }
}

export { CONNECTION_STATES as OLX_CONNECTION_STATES };
