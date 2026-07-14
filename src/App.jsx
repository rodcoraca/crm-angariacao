import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Radar from "./pages/Radar";
import RadarImovirtual from "./pages/RadarImovirtual";
import AdministracaoDocumentacao from "./pages/AdministracaoDocumentacao";
import Forbidden from "./pages/Forbidden";
import Fluxo from "./pages/Fluxo";
import Dashboard from "./pages/Dashboard";
import LeadsPorTipo from "./pages/LeadsPorTipo";
import MensagensPadrao from "./pages/MensagensPadrao";
import EstoqueNaoPublicitado from "./EstoqueNaoPublicitado";
import FichaLead from "./FichaLead";
import Usuarios from "./pages/Usuarios";
import Logs from "./pages/Logs";

import Sidebar from "./components/Sidebar";
import Layout from "./components/Layout";
import {
  authorizeProtectedView,
  isProtectedView,
  getRequiredPermission,
  loadAuthorizationProfileByAuthUserId,
  normalizePermissions,
  reconcilePendingActivation,
  registerUserSession,
  startSessionActivityTracking,
  updateSessionActivity,
} from "./modules/auth/services";
import { AuthProvider } from "./modules/auth/context";
import { registrarAcessoNegado, registrarLogout, registrarNavegacao } from "./modules/audit/services";
import FeedbackHost from "./components/ui/FeedbackHost";
import { notifyError, notifyInfo } from "./components/ui/feedbackBus";

const ACTIVE_SESSION_TENANT_KEY = "osflow_active_session_empresa_id";

function detectPasswordRecoveryHash() {
  if (typeof window === "undefined") return false;
  return String(window.location.hash || "").includes("type=recovery");
}

export default function App() {
  const [isPasswordRecoveryMode, setIsPasswordRecoveryMode] = useState(detectPasswordRecoveryHash);
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authzReady, setAuthzReady] = useState(false);
  const [view, setView] = useState("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leadSelecionadoId, setLeadSelecionadoId] = useState(null);
  const [viewAnteriorFicha, setViewAnteriorFicha] = useState("fluxo");
  const [logsModo, setLogsModo] = useState("geral");
  const [docSelecionado, setDocSelecionado] = useState("arquitetura");
  const [imovelSelectionRequest, setImovelSelectionRequest] = useState(null);
  const [userSelectionRequest, setUserSelectionRequest] = useState(null);
  const [forbiddenState, setForbiddenState] = useState({ requestedView: null, requiredPermission: null });
  const isManualLogoutRef = useRef(false);
  const latestUserRef = useRef(null);
  const latestPerfilRef = useRef(null);
  const sessionInitializedRef = useRef(false);
  const sessionInitializedUserRef = useRef(null);
  const sessionInitializationInFlightRef = useRef(null);

  useEffect(() => {
    latestUserRef.current = user;
  }, [user]);

  useEffect(() => {
    latestPerfilRef.current = perfil;
  }, [perfil]);

  function reportAuthError(error, origem) {
    console.error(`[${origem}]`, error);
  }

  const withTimeout = useCallback((promise, timeoutMs, code) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        window.setTimeout(() => {
          reject(new Error(code || "auth_timeout"));
        }, timeoutMs);
      })
    ]);
  }, []);

  const serializePermissions = useCallback((permissoes) => {
    try {
      return JSON.stringify(permissoes || {});
    } catch (_error) {
      return "{}";
    }
  }, []);

  const isSameUserSession = useCallback((a, b) => {
    if (!a || !b) return false;

    return (
      a.id === b.id &&
      a.auth_user_id === b.auth_user_id &&
      a.perfil_id === b.perfil_id &&
      a.email === b.email &&
      a.expires_at === b.expires_at &&
      (a.user_metadata?.empresa_id || null) === (b.user_metadata?.empresa_id || null) &&
      serializePermissions(a.user_metadata?.permissoes) === serializePermissions(b.user_metadata?.permissoes)
    );
  }, [serializePermissions]);

  const isSameProfile = useCallback((a, b) => {
    if (!a || !b) return false;

    return (
      (a.id || null) === (b.id || null) &&
      (a.auth_user_id || null) === (b.auth_user_id || null) &&
      (a.email || null) === (b.email || null) &&
      (a.empresa_id || null) === (b.empresa_id || null) &&
      (a.ativo ?? true) === (b.ativo ?? true) &&
      serializePermissions(a.permissoes) === serializePermissions(b.permissoes)
    );
  }, [serializePermissions]);

  const montarUsuarioSessao = useCallback((authUser, perfilAtual, expiresAt = null) => {
    const empresaId = perfilAtual?.empresa_id || authUser.user_metadata?.empresa_id || null;

    return {
      id: authUser.id,
      auth_user_id: authUser.id,
      perfil_id: perfilAtual?.id || null,
      empresa_id: empresaId,
      email: authUser.email,
      expires_at: expiresAt,
      user_metadata: {
        nome: perfilAtual?.nome || authUser.user_metadata?.nome || authUser.user_metadata?.full_name || authUser.user_metadata?.name || "",
        apelido: perfilAtual?.apelido || authUser.user_metadata?.apelido || "",
        username: perfilAtual?.username || authUser.user_metadata?.username || authUser.email || "",
        telefone: perfilAtual?.telefone || authUser.user_metadata?.telefone || "",
        perfil: authUser.user_metadata?.perfil || "",
        empresa_id: empresaId,
        permissoes: perfilAtual?.permissoes || authUser.user_metadata?.permissoes || {}
      }
    };
  }, []);

  const restoreEmpresaIdFromStorage = useCallback(() => {
    if (typeof window === "undefined") return null;

    const stored = window.localStorage.getItem(ACTIVE_SESSION_TENANT_KEY);
    const normalized = String(stored || "").trim();
    return normalized || null;
  }, []);

  const hydrateSessionFromAuth = useCallback(async (authSession, { notifyOnExpired = false } = {}) => {
    const authUser = authSession?.user || null;

    if (!authUser?.id) {
      setUser(null);
      setPerfil(null);
      setAuthzReady(true);
      return { ok: false, reason: "missing_auth_user" };
    }

    setAuthzReady(false);

    try {
      const { data: perfilAtual, error } = await withTimeout(
        loadAuthorizationProfileByAuthUserId(authUser),
        8000,
        "authz_init_timeout"
      );

      if (error) {
        reportAuthError(error, "App.hydrateSessionFromAuth.loadAuthorizationProfileByAuthUserId");
      }

      if (!perfilAtual) {
        await supabase.auth.signOut();
        setUser(null);
        setPerfil(null);
        if (notifyOnExpired) {
          notifyInfo("Sessão expirada. Faça login novamente.");
        }
        return { ok: false, reason: "missing_profile" };
      }

      const activationReconciliation = await reconcilePendingActivation(authUser, perfilAtual);
      if (activationReconciliation.error) {
        reportAuthError(activationReconciliation.error, "App.hydrateSessionFromAuth.reconcilePendingActivation");
      }

      const perfilResolvido = activationReconciliation.data || perfilAtual;

      if (perfilResolvido.ativo === false) {
        await supabase.auth.signOut();
        setUser(null);
        setPerfil(null);
        notifyError("Utilizador inativo. Contacte um administrador.");
        return { ok: false, reason: "inactive_user" };
      }

      if (perfilResolvido?.empresa_id && typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_SESSION_TENANT_KEY, String(perfilResolvido.empresa_id));
      }

      const nextPerfil = { ...perfilResolvido, permissoes: perfilResolvido.permissoes || {} };
      const nextUser = montarUsuarioSessao(authUser, perfilResolvido, authSession?.expires_at || null);
      const profileChanged = !isSameProfile(latestPerfilRef.current, nextPerfil);
      const userChanged = !isSameUserSession(latestUserRef.current, nextUser);

      if (profileChanged) {
        setPerfil(nextPerfil);
      }

      if (userChanged) {
        setUser(nextUser);
      }

      const sessionUserId = perfilResolvido.id || authUser.id;
      const sessionEmpresaId = perfilResolvido.empresa_id || null;

      if (
        sessionInitializedRef.current
        && sessionInitializedUserRef.current
        && String(sessionInitializedUserRef.current) === String(sessionUserId)
      ) {
        await updateSessionActivity({
          userId: sessionUserId,
          empresaId: sessionEmpresaId,
        });

        startSessionActivityTracking({
          userId: sessionUserId,
        });

        return { ok: true, reused: true };
      }

      if (!sessionInitializationInFlightRef.current) {
        sessionInitializationInFlightRef.current = (async () => {
          // Evita dupla criacao de sessao quando bootstrap/getSession e onAuthStateChange
          // disparam quase ao mesmo tempo no mesmo login.
          const activityResult = await updateSessionActivity({
            userId: sessionUserId,
            empresaId: sessionEmpresaId,
          });

          if (!activityResult.ok) {
            await registerUserSession({
              userId: sessionUserId,
              empresaId: sessionEmpresaId,
              userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
            });
          }

          sessionInitializedRef.current = true;
          sessionInitializedUserRef.current = sessionUserId;

          startSessionActivityTracking({
            userId: sessionUserId,
          });

          return { ok: true };
        })().finally(() => {
          sessionInitializationInFlightRef.current = null;
        });
      }

      await sessionInitializationInFlightRef.current;

      return { ok: true };
    } catch (error) {
      reportAuthError(error, "App.hydrateSessionFromAuth");

      const previousUser = latestUserRef.current;
      const previousProfile = latestPerfilRef.current;
      const fallbackPermissions = normalizePermissions({
        ...(previousProfile?.permissoes || {}),
        ...(previousUser?.user_metadata?.permissoes || {}),
        ...(authUser.user_metadata?.permissoes || {})
      });

      const fallbackPerfil = {
        ...(previousProfile || {}),
        empresa_id: authUser.user_metadata?.empresa_id || null,
        permissoes: fallbackPermissions
      };
      const fallbackUser = montarUsuarioSessao(authUser, fallbackPerfil, authSession?.expires_at || null);

      setUser((prev) => (prev ? (isSameUserSession(prev, fallbackUser) ? prev : fallbackUser) : fallbackUser));
      setPerfil((prev) => (prev ? (isSameProfile(prev, fallbackPerfil) ? prev : fallbackPerfil) : fallbackPerfil));
      return { ok: true, warning: "authz_timeout" };
    } finally {
      setAuthzReady(true);
    }
  }, [isSameProfile, isSameUserSession, montarUsuarioSessao, withTimeout]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuthSession() {
      try {
        if (isPasswordRecoveryMode) {
          setUser(null);
          setPerfil(null);
          setAuthzReady(true);
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error) {
          reportAuthError(error, "App.bootstrapAuthSession.getSession");
          notifyError("Erro de comunicação ao validar a sessão.");
          setAuthzReady(true);
          return;
        }

        if (data?.session?.user) {
          const restoredEmpresaId = restoreEmpresaIdFromStorage();
          const bootstrapProfile = restoredEmpresaId ? { empresa_id: restoredEmpresaId } : null;
          const nextUser = montarUsuarioSessao(data.session.user, bootstrapProfile, data.session?.expires_at || null);
          setUser((prev) => (isSameUserSession(prev, nextUser) ? prev : nextUser));
          hydrateSessionFromAuth(data.session, { notifyOnExpired: true });
        } else {
          setAuthzReady(true);
        }
      } catch (error) {
        if (!isMounted) return;
        reportAuthError(error, "App.bootstrapAuthSession");
        notifyError("Erro interno ao recuperar a sessão.");
        setAuthzReady(true);
      } finally {
        if (isMounted) {
          setAuthReady(true);
        }
      }
    }

    bootstrapAuthSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecoveryMode(true);
        setUser(null);
        setPerfil(null);
        setAuthzReady(true);
        return;
      }

      if (event === "SIGNED_OUT") {
        sessionInitializedRef.current = false;
        sessionInitializedUserRef.current = null;
        sessionInitializationInFlightRef.current = null;
        setUser(null);
        setPerfil(null);
        setAuthzReady(true);

        if (isManualLogoutRef.current) {
          isManualLogoutRef.current = false;
          return;
        }

        notifyInfo("Sessão expirada. Faça login novamente.");
        return;
      }

      if (!session?.user) {
        sessionInitializedRef.current = false;
        sessionInitializedUserRef.current = null;
        sessionInitializationInFlightRef.current = null;
        setAuthzReady(true);
        return;
      }

      if (isPasswordRecoveryMode) {
        setUser(null);
        setPerfil(null);
        setAuthzReady(true);
        return;
      }

      const restoredEmpresaId = restoreEmpresaIdFromStorage();
      const bootstrapProfile = restoredEmpresaId ? { empresa_id: restoredEmpresaId } : null;
      const nextUser = montarUsuarioSessao(session.user, bootstrapProfile, session?.expires_at || null);
      setUser((prev) => (isSameUserSession(prev, nextUser) ? prev : nextUser));
      hydrateSessionFromAuth(session, { notifyOnExpired: event !== "SIGNED_IN" });
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, [hydrateSessionFromAuth, isPasswordRecoveryMode, isSameUserSession, montarUsuarioSessao, restoreEmpresaIdFromStorage]);

  function getHeaderContextTitle() {
    if (leadSelecionadoId) return "Leads";

    const titles = {
      home: "Cockpit",
      radar: "Radar",
      radar_imovirtual: "Radar",
      fluxo: "Leads",
      dashboard: "Administração",
      quente: "Leads",
      morno: "Leads",
      frio: "Leads",
      estoque_np: "Imóveis",
      admin_documentacao: "Documentos",
      mensagens: "Mensagens",
      usuarios: "Administração",
      logs: "Auditoria",
      forbidden: "Acesso"
    };

    return titles[view] || "Cockpit";
  }

  async function logout() {
    isManualLogoutRef.current = true;

    try {
      await registrarLogout({
        userId: user?.perfil_id || user?.id || null,
        empresaId: perfil?.empresa_id || user?.user_metadata?.empresa_id || null,
        modulo: "auth",
        entidade: "usuarios",
        entidadeId: user?.perfil_id || user?.id || null,
        metadata: {
          email: user?.email || null
        }
      });
    } catch (error) {
      reportAuthError(error, "App.logout.registrarLogout");
      await supabase.auth.signOut();
      notifyError("Erro de comunicação no logout. Sessão local encerrada.");
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ACTIVE_SESSION_TENANT_KEY);
      }

      setUser(null);
      setPerfil(null);
      setAuthzReady(true);
    }
  }

  function abrirFichaLead(id) {
    setLeadSelecionadoId(id);
    setViewAnteriorFicha(view);
  }

  async function abrirResultadoPesquisaCockpit(result) {
    if (!result?.targetId || !result?.targetType) {
      return;
    }

    if (result.targetType === "lead") {
      abrirFichaLead(result.targetId);
      await registrarLog("pesquisa_global", `Abriu ${result.type}: ${result.title}`);
      return;
    }

    if (result.targetType === "imovel") {
      const authorization = authorizeProtectedView("estoque_np", createAuthorizationContext());
      if (!authorization.allowed) {
        await handleForbiddenAccess("estoque_np", authorization.requiredPermission, authorization.reason);
        return;
      }

      setImovelSelectionRequest({ id: result.targetId, nonce: Date.now() });
      setLeadSelecionadoId(null);
      setView("estoque_np");
      await registrarLog("pesquisa_global", `Abriu Imóvel: ${result.title}`);
      return;
    }

    if (result.targetType === "user") {
      const authorization = authorizeProtectedView("usuarios", createAuthorizationContext());
      if (!authorization.allowed) {
        await handleForbiddenAccess("usuarios", authorization.requiredPermission, authorization.reason);
        return;
      }

      setUserSelectionRequest({ id: result.targetId, nonce: Date.now() });
      setLeadSelecionadoId(null);
      setView("usuarios");
      await registrarLog("pesquisa_global", `Abriu Utilizador: ${result.title}`);
    }
  }

  function mudarView(nextView) {
    if (nextView === "forbidden") {
      setView("forbidden");
      return;
    }

    if (isProtectedView(nextView)) {
      if (!authzReady) {
        return;
      }

      const authorization = authorizeProtectedView(nextView, createAuthorizationContext());

      if (!authorization.allowed) {
        handleForbiddenAccess(nextView, authorization.requiredPermission, authorization.reason);
        return;
      }
    }

    const docsMap = {
      admin_docs_arquitetura: "arquitetura",
      admin_docs_banco_dados: "banco_dados",
      admin_docs_roadmap: "roadmap",
      admin_docs_saas: "saas",
      admin_docs_seguranca: "seguranca",
      admin_docs_changelog: "changelog"
    };

    if (docsMap[nextView]) {
      setDocSelecionado(docsMap[nextView]);
      setView("admin_documentacao");
      registrarLog("navegacao", `Acedeu a documentos (${docsMap[nextView]})`);
      return;
    }

    setView(nextView);
    registrarLog("navegacao", `Acedeu a ${nextView}`);
  }

  async function handleForbiddenAccess(requestedView, requiredPermission, reason) {
    setForbiddenState({
      requestedView,
      requiredPermission: requiredPermission || getRequiredPermission(requestedView)
    });
    setView("forbidden");
    await registrarAcessoNegado({
      userId: user?.perfil_id || user?.id || null,
      empresaId: perfil?.empresa_id || user?.user_metadata?.empresa_id || null,
      modulo: "authz",
      entidade: "rota",
      entidadeId: requestedView,
      metadata: {
        requiredPermission: requiredPermission || null,
        reason: reason || null
      }
    });
  }

  function createAuthorizationContext() {
    const mergedPermissions = normalizePermissions({
      ...(user?.user_metadata?.permissoes || {}),
      ...(perfil?.permissoes || {})
    });

    const effectivePerfil = {
      ...(perfil || {}),
      empresa_id: perfil?.empresa_id || user?.user_metadata?.empresa_id || null,
      permissoes: mergedPermissions
    };

    return {
      user,
      perfil: effectivePerfil,
      activeCompanyId: perfil?.empresa_id || user?.user_metadata?.empresa_id || null,
      session: {
        expiresAt: user?.expires_at || null
      }
    };
  }

  function canAccessView(viewKey) {
    if (!authzReady) return true;
    return authorizeProtectedView(viewKey, createAuthorizationContext()).allowed;
  }

  const authContextValue = useMemo(() => ({
    user,
    perfil,
    activeCompanyId: perfil?.empresa_id || user?.user_metadata?.empresa_id || null,
    session: {
      expiresAt: user?.expires_at || null
    }
  }), [perfil, user]);

  function abrirLogs(modo) {
    if (!authzReady) return;

    const authorization = authorizeProtectedView("logs", createAuthorizationContext());
    if (!authorization.allowed) {
      handleForbiddenAccess("logs", authorization.requiredPermission, authorization.reason);
      return;
    }

    setLogsModo(modo);
    setView("logs");
    registrarLog("navegacao", `Acedeu a auditoria (${modo === "utilizadores" ? "por utilizador" : "geral"})`);
  }

  async function registrarLog(acao, detalhes) {
    const actorId = user?.perfil_id || user?.id || null;
    if (!actorId) return;
    await registrarNavegacao({
      userId: actorId,
      acao,
      detalhes
    });
  }

  function voltarDaFicha() {
    setLeadSelecionadoId(null);
    setView(viewAnteriorFicha);
  }

  async function handleLogin(usuario) {
    if (usuario?.id) {
      setUser((prev) => (isSameUserSession(prev, usuario) ? prev : usuario));
    }

    if (usuario?.user_metadata?.permissoes && typeof usuario.user_metadata.permissoes === "object") {
      const nextPerfil = {
        empresa_id: usuario.empresa_id || usuario.user_metadata?.empresa_id || null,
        permissoes: normalizePermissions(usuario.user_metadata.permissoes)
      };

      setPerfil((prev) => (prev ? (isSameProfile(prev, nextPerfil) ? prev : nextPerfil) : nextPerfil));
    }

    setAuthzReady(false);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        reportAuthError(error, "App.handleLogin.getSession");
        notifyError("Erro de comunicação ao inicializar sessão autenticada.");
        return;
      }

      if (!data?.session?.user) {
        notifyError("Sessão autenticada não encontrada. Faça login novamente.");
        return;
      }

      hydrateSessionFromAuth(data.session, { notifyOnExpired: false });
    } finally {
      setAuthReady(true);
    }
  }

  if (!authReady || !user) {
    return (
      <>
        <Login
          onLogin={handleLogin}
          passwordRecoveryMode={isPasswordRecoveryMode}
          onPasswordRecoveryComplete={() => {
            setIsPasswordRecoveryMode(false);
            if (typeof window !== "undefined") {
              window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
            }
          }}
        />
        <FeedbackHost />
      </>
    );
  }

  const screens = {
    home: canAccessView("home") ? <Home user={user} onOpenSearchResult={abrirResultadoPesquisaCockpit} /> : <Forbidden requestedView="home" requiredPermission={getRequiredPermission("home")} />,
    radar: canAccessView("radar") ? <Radar /> : <Forbidden requestedView="radar" requiredPermission={getRequiredPermission("radar")} />,
    radar_imovirtual: canAccessView("radar_imovirtual") ? <RadarImovirtual /> : <Forbidden requestedView="radar_imovirtual" requiredPermission={getRequiredPermission("radar_imovirtual")} />,
    admin_documentacao: canAccessView("admin_documentacao") ? <AdministracaoDocumentacao selectedDoc={docSelecionado} /> : <Forbidden requestedView="admin_documentacao" requiredPermission={getRequiredPermission("admin_documentacao")} />,
    forbidden: <Forbidden requestedView={forbiddenState.requestedView} requiredPermission={forbiddenState.requiredPermission} />,
    fluxo: canAccessView("fluxo") ? <Fluxo user={user} onAbrirLead={abrirFichaLead} /> : <Forbidden requestedView="fluxo" requiredPermission={getRequiredPermission("fluxo")} />,
    dashboard: canAccessView("dashboard") ? <Dashboard onAbrirLead={abrirFichaLead} /> : <Forbidden requestedView="dashboard" requiredPermission={getRequiredPermission("dashboard")} />,
    quente: canAccessView("quente") ? <LeadsPorTipo tipo="quente" user={user} onAbrirLead={abrirFichaLead} /> : <Forbidden requestedView="quente" requiredPermission={getRequiredPermission("quente")} />,
    morno: canAccessView("morno") ? <LeadsPorTipo tipo="morno" user={user} onAbrirLead={abrirFichaLead} /> : <Forbidden requestedView="morno" requiredPermission={getRequiredPermission("morno")} />,
    frio: canAccessView("frio") ? <LeadsPorTipo tipo="frio" user={user} onAbrirLead={abrirFichaLead} /> : <Forbidden requestedView="frio" requiredPermission={getRequiredPermission("frio")} />,
    mensagens: canAccessView("mensagens") ? <MensagensPadrao /> : <Forbidden requestedView="mensagens" requiredPermission={getRequiredPermission("mensagens")} />,
    estoque_np: canAccessView("estoque_np") ? <EstoqueNaoPublicitado selectionRequest={imovelSelectionRequest} /> : <Forbidden requestedView="estoque_np" requiredPermission={getRequiredPermission("estoque_np")} />,
    usuarios: canAccessView("usuarios") ? <Usuarios currentUser={user} selectionRequest={userSelectionRequest} /> : <Forbidden requestedView="usuarios" requiredPermission={getRequiredPermission("usuarios")} />,
    logs: canAccessView("logs") ? <Logs modo={logsModo} onModoChange={setLogsModo} currentUser={user} /> : <Forbidden requestedView="logs" requiredPermission={getRequiredPermission("logs")} />,
  };

  return (
    <AuthProvider value={authContextValue}>
      <Layout
        collapsed={sidebarCollapsed}
        header={
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontWeight: 600 }}>
            <span style={{ color: "var(--os-color-accent)", fontSize: "16px" }}>OSFlow</span>
            <span style={{ color: "var(--os-color-text-light)", opacity: 0.85, fontSize: "13px" }}>/ {getHeaderContextTitle()}</span>
            <span style={{ color: "var(--os-color-text-light)", opacity: 0.92, fontSize: "14px" }}>Fluxo inteligente | Resultados reais</span>
          </div>
        }
        footer={<span>OSFlow • Gestão operacional</span>}
        sidebar={
          <Sidebar
            setView={mudarView}
            logout={logout}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((value) => !value)}
            perfil={perfil}
            onSelectLogsView={abrirLogs}
          />
        }
      >
        {leadSelecionadoId ? (
          <FichaLead leadId={leadSelecionadoId} user={user} voltar={voltarDaFicha} />
        ) : (
          screens[view]
        )}
      </Layout>
      <FeedbackHost />
    </AuthProvider>
  );
}
