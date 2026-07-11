import { OlxProvider } from "../providers/OlxProvider";
import { isOlxAccessTokenExpired, loadOlxIntegrationConfig } from "../../integrations";

export const RADAR_PROVIDER_MODES = {
  OLX: "olx"
};

function resolveRuntimeMode() {
  if (typeof window !== "undefined" && window.__OSFLOW_RADAR_PROVIDER__) {
    return String(window.__OSFLOW_RADAR_PROVIDER__).toLowerCase();
  }

  const fromEnv = process.env.REACT_APP_RADAR_PROVIDER || "";
  return String(fromEnv).toLowerCase();
}

function hasUsableOlxSession() {
  const config = loadOlxIntegrationConfig();

  if (!config?.clientId || !config?.clientSecret) {
    return false;
  }

  if (config.accessToken && !isOlxAccessTokenExpired(config.expiresAt)) {
    return true;
  }

  return Boolean(config.refreshToken);
}

export function buildConfiguredRadarProvider(mode) {
  const targetMode = String(mode || resolveRuntimeMode()).toLowerCase();

  if (targetMode === RADAR_PROVIDER_MODES.OLX || hasUsableOlxSession()) {
    return new OlxProvider();
  }

  return null;
}

export function getConfiguredRadarProviderMode() {
  return resolveRuntimeMode();
}
