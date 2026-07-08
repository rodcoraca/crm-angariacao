import { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useTheme } from "../theme/ThemeContext";
import {
  buildOlxOAuthUrlFromCurrentConfig,
  clearOlxIntegrationState,
  completeOlxOAuthCallback,
  getDefaultOlxCallbackUrl,
  loadOlxIntegrationConfig,
  saveOlxIntegrationConfig
} from "../modules/integrations";

const PENDING_STATE_KEY = "osflow_olx_oauth_state";

function readPendingState() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(PENDING_STATE_KEY) || "";
}

function writePendingState(state) {
  if (typeof window === "undefined") return;
  if (!state) {
    window.sessionStorage.removeItem(PENDING_STATE_KEY);
    return;
  }
  window.sessionStorage.setItem(PENDING_STATE_KEY, state);
}

function clearPendingState() {
  writePendingState("");
}

function getCurrentQueryState() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export default function IntegrationCallback() {
  const theme = useTheme();
  const query = useMemo(() => getCurrentQueryState(), []);
  const processedCodeRef = useRef(false);
  const [config, setConfig] = useState(() => loadOlxIntegrationConfig());
  const [status, setStatus] = useState("ready");
  const [message, setMessage] = useState("Configure as credenciais do OLX e conclua o OAuth nesta página.");
  const [clientId, setClientId] = useState(config.clientId || "1ff6b593-3fb4-401c-81ca-0f357dbf8641");
  const [clientSecret, setClientSecret] = useState(config.clientSecret || "fbae708c090d43fa21198cd7ee2803e3");
  const [redirectUri, setRedirectUri] = useState(config.redirectUri || getDefaultOlxCallbackUrl());
  const [scope, setScope] = useState(config.scope || "v2 read write");

  useEffect(() => {
    const code = query.get("code");
    const error = query.get("error") || query.get("error_description");
    const incomingState = query.get("state") || "";

    if (error) {
      setStatus("error");
      setMessage(`OLX devolveu um erro: ${error}`);
      return;
    }

    if (!code) {
      return;
    }

    const pendingState = readPendingState();
    if (pendingState && incomingState && pendingState !== incomingState) {
      setStatus("error");
      setMessage("O state OAuth recebido não corresponde ao pedido iniciado.");
      return;
    }

    if (processedCodeRef.current) {
      return;
    }

    processedCodeRef.current = true;
    let cancelled = false;

    async function completeCallback() {
      try {
        setStatus("loading");
        setMessage("A concluir autenticação OAuth do OLX...");

        const nextConfig = await completeOlxOAuthCallback({
          code,
          clientId: clientId || config.clientId,
          clientSecret: clientSecret || config.clientSecret,
          redirectUri: redirectUri || config.redirectUri || getDefaultOlxCallbackUrl(),
          scope: scope || config.scope || "v2 read write"
        });

        if (cancelled) return;

        setConfig(nextConfig);
        setClientId(nextConfig.clientId || "");
        setClientSecret(nextConfig.clientSecret || "");
        setRedirectUri(nextConfig.redirectUri || getDefaultOlxCallbackUrl());
        setScope(nextConfig.scope || "v2 read write");
        setStatus("success");
        setMessage("Autenticação OLX concluída com sucesso.");
        clearPendingState();
        window.history.replaceState({}, "", window.location.pathname);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err?.message || "Falha ao concluir a autenticação OLX.");
      }
    }

    completeCallback();

    return () => {
      cancelled = true;
    };
  }, [clientId, clientSecret, config.clientId, config.clientSecret, config.redirectUri, config.scope, query, redirectUri, scope]);

  function handleSaveCredentials() {
    const nextConfig = saveOlxIntegrationConfig({
      clientId,
      clientSecret,
      redirectUri,
      scope
    });

    setConfig(nextConfig);
    setMessage("Credenciais OLX guardadas na configuração central de integrações.");
    setStatus("success");
  }

  function handleStartOAuth() {
    const state = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `olx-${Math.random().toString(36).slice(2, 12)}`;

    writePendingState(state);

    const nextConfig = saveOlxIntegrationConfig({
      clientId,
      clientSecret,
      redirectUri,
      scope,
      state
    });

    setConfig(nextConfig);
    const authUrl = buildOlxOAuthUrlFromCurrentConfig(state);
    window.location.assign(authUrl);
  }

  function handleClear() {
    clearOlxIntegrationState();
    clearPendingState();
    setClientId("");
    setClientSecret("");
    setRedirectUri(getDefaultOlxCallbackUrl());
    setScope("v2 read write");
    setConfig(loadOlxIntegrationConfig());
    setStatus("ready");
    setMessage("Configuração OLX limpa.");
  }

  const fieldStyle = {
    width: "100%",
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.border}`,
    fontSize: theme.typography.body.fontSize,
    outline: "none"
  };

  const pageStyle = {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: theme.layout.pagePadding,
    background: theme.colors.background
  };

  const shellStyle = {
    width: "min(920px, 100%)",
    display: "grid",
    gap: theme.layout.gap
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: theme.layout.padding
  };

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <Card style={{ padding: theme.layout.padding, display: "grid", gap: theme.layout.gap }}>
          <div style={{ color: theme.colors.accent, fontWeight: theme.typography.cardTitle.fontWeight, fontSize: theme.typography.caption.fontSize }}>
            OSFlow Integrations
          </div>
          <h1 style={{ margin: 0, color: theme.colors.text, fontSize: theme.typography.h1.fontSize, fontWeight: theme.typography.h1.fontWeight }}>
            Callback genérica para OAuth do OLX
          </h1>
          <p style={{ margin: 0, color: theme.colors.muted, lineHeight: theme.typography.body.lineHeight, fontSize: theme.typography.body.fontSize }}>
            Esta página recebe o authorization code do OLX, conclui a troca por access token e refresh token,
            e guarda as credenciais na configuração central de integrações.
          </p>
          <p style={{ margin: 0, color: status === "error" ? theme.colors.statusDangerText : status === "success" ? theme.colors.statusSuccessText : theme.colors.muted, fontSize: theme.typography.body.fontSize }}>
            {message}
          </p>
        </Card>

        <div style={gridStyle}>
          <Card style={{ padding: theme.layout.padding, display: "grid", gap: theme.layout.gap }}>
            <h2 style={{ margin: 0, color: theme.colors.text, fontSize: theme.typography.h2.fontSize, fontWeight: theme.typography.h2.fontWeight }}>Credenciais OLX</h2>

            <label style={{ display: "grid", gap: theme.spacing.xs, color: theme.colors.text, fontSize: theme.typography.caption.fontSize }}>
              Client ID
              <Input value={clientId} onChange={(event) => setClientId(event.target.value)} style={fieldStyle} />
            </label>

            <label style={{ display: "grid", gap: theme.spacing.xs, color: theme.colors.text, fontSize: theme.typography.caption.fontSize }}>
              Client Secret
              <Input
                type="password"
                value={clientSecret}
                onChange={(event) => setClientSecret(event.target.value)}
                style={fieldStyle}
              />
            </label>

            <label style={{ display: "grid", gap: theme.spacing.xs, color: theme.colors.text, fontSize: theme.typography.caption.fontSize }}>
              Redirect URI
              <Input value={redirectUri} onChange={(event) => setRedirectUri(event.target.value)} style={fieldStyle} />
            </label>

            <label style={{ display: "grid", gap: theme.spacing.xs, color: theme.colors.text, fontSize: theme.typography.caption.fontSize }}>
              Scope
              <Input value={scope} onChange={(event) => setScope(event.target.value)} style={fieldStyle} />
            </label>

            <div style={{ display: "flex", gap: theme.spacing.sm, flexWrap: "wrap" }}>
              <Button variant="primary" onClick={handleSaveCredentials}>Guardar credenciais</Button>
              <Button variant="secondary" onClick={handleStartOAuth}>Autenticar com OLX</Button>
              <Button variant="ghost" onClick={handleClear}>Limpar</Button>
            </div>
          </Card>

          <Card style={{ padding: theme.layout.padding, display: "grid", gap: theme.layout.gap }}>
            <h2 style={{ margin: 0, color: theme.colors.text, fontSize: theme.typography.h2.fontSize, fontWeight: theme.typography.h2.fontWeight }}>Estado atual</h2>

            <div style={{ display: "grid", gap: theme.spacing.sm, color: theme.colors.text, fontSize: theme.typography.body.fontSize }}>
              <div><strong>Callback padrão:</strong> {getDefaultOlxCallbackUrl()}</div>
              <div><strong>Client ID:</strong> {config.clientId || "não configurado"}</div>
              <div><strong>Access token:</strong> {config.accessToken ? "configurado" : "em falta"}</div>
              <div><strong>Refresh token:</strong> {config.refreshToken ? "configurado" : "em falta"}</div>
              <div><strong>Expires at:</strong> {config.expiresAt || "em falta"}</div>
              <div><strong>Scope:</strong> {config.scope || "v2 read write"}</div>
              <div><strong>State pendente:</strong> {readPendingState() || "nenhum"}</div>
            </div>

            <p style={{ margin: 0, color: theme.colors.muted, lineHeight: theme.typography.body.lineHeight, fontSize: theme.typography.body.fontSize }}>
              O OLX deve redirecionar para esta callback com o parâmetro <strong>code</strong>. Nesta sprint o Radar
              apenas guarda e renova tokens; não há consumo de anúncios.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
