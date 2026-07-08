import { useState } from "react";
import { supabase } from "./supabase";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Radar from "./pages/Radar";
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
import { authorizeProtectedView, isProtectedView, getRequiredPermission } from "./modules/auth/services";
import { AuthProvider } from "./modules/auth/context";
import { registrarAcessoNegado, registrarLogout, registrarNavegacao } from "./modules/audit/services";
import FeedbackHost from "./components/ui/FeedbackHost";

export default function App() {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [view, setView] = useState("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leadSelecionadoId, setLeadSelecionadoId] = useState(null);
  const [viewAnteriorFicha, setViewAnteriorFicha] = useState("fluxo");
  const [logsModo, setLogsModo] = useState("geral");
  const [docSelecionado, setDocSelecionado] = useState("arquitetura");
  const [forbiddenState, setForbiddenState] = useState({ requestedView: null, requiredPermission: null });

  function getHeaderContextTitle() {
    if (leadSelecionadoId) return "Leads";

    const titles = {
      home: "Cockpit",
      radar: "Radar",
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

  async function carregarPerfil(authUserId) {
    const { data } = await supabase
      .from("usuarios")
      .select("email, empresa_id, permissoes")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (data) {
      setPerfil({ ...data, permissoes: data.permissoes || {} });
    } else {
      setPerfil({ permissoes: { fluxo: true, dashboard: true, quente: true, morno: true, frio: true, mensagens: true, estoque_np: true, usuarios: false, logs: false } });
    }
  }

  async function logout() {
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

    setUser(null);
    setPerfil(null);
  }

  function abrirFichaLead(id) {
    setLeadSelecionadoId(id);
    setViewAnteriorFicha(view);
  }

  function mudarView(nextView) {
    if (nextView === "forbidden") {
      setView("forbidden");
      return;
    }

    if (isProtectedView(nextView)) {
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
      registrarLog('navegacao', `Acedeu a documentos (${docsMap[nextView]})`);
      return;
    }

    setView(nextView);
    registrarLog('navegacao', `Acedeu a ${nextView}`);
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
    return {
      user,
      perfil,
      activeCompanyId: perfil?.empresa_id || user?.user_metadata?.empresa_id || null,
      session: {
        expiresAt: user?.expires_at || null
      }
    };
  }

  function canAccessView(viewKey) {
    return authorizeProtectedView(viewKey, createAuthorizationContext()).allowed;
  }

  function abrirLogs(modo) {
    const authorization = authorizeProtectedView("logs", createAuthorizationContext());
    if (!authorization.allowed) {
      handleForbiddenAccess("logs", authorization.requiredPermission, authorization.reason);
      return;
    }

    setLogsModo(modo);
    setView('logs');
    registrarLog('navegacao', `Acedeu a auditoria (${modo === 'utilizadores' ? 'por utilizador' : 'geral'})`);
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

  function handleLogin(usuario) {
    setUser(usuario);
    carregarPerfil(usuario.id);
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const screens = {
    home: canAccessView('home') ? <Home user={user} /> : <Forbidden requestedView="home" requiredPermission={getRequiredPermission("home")} />,
    radar: canAccessView('radar') ? <Radar /> : <Forbidden requestedView="radar" requiredPermission={getRequiredPermission("radar")} />,
    admin_documentacao: canAccessView('admin_documentacao') ? <AdministracaoDocumentacao selectedDoc={docSelecionado} /> : <Forbidden requestedView="admin_documentacao" requiredPermission={getRequiredPermission("admin_documentacao")} />,
    forbidden: <Forbidden requestedView={forbiddenState.requestedView} requiredPermission={forbiddenState.requiredPermission} />,
    fluxo: canAccessView('fluxo') ? <Fluxo user={user} onAbrirLead={abrirFichaLead} /> : <Forbidden requestedView="fluxo" requiredPermission={getRequiredPermission("fluxo")} />,
    dashboard: canAccessView('dashboard') ? <Dashboard onAbrirLead={abrirFichaLead} /> : <Forbidden requestedView="dashboard" requiredPermission={getRequiredPermission("dashboard")} />,
    quente: canAccessView('quente') ? <LeadsPorTipo tipo="quente" user={user} onAbrirLead={abrirFichaLead} /> : <Forbidden requestedView="quente" requiredPermission={getRequiredPermission("quente")} />,
    morno: canAccessView('morno') ? <LeadsPorTipo tipo="morno" user={user} onAbrirLead={abrirFichaLead} /> : <Forbidden requestedView="morno" requiredPermission={getRequiredPermission("morno")} />,
    frio: canAccessView('frio') ? <LeadsPorTipo tipo="frio" user={user} onAbrirLead={abrirFichaLead} /> : <Forbidden requestedView="frio" requiredPermission={getRequiredPermission("frio")} />,
    mensagens: canAccessView('mensagens') ? <MensagensPadrao /> : <Forbidden requestedView="mensagens" requiredPermission={getRequiredPermission("mensagens")} />,
    estoque_np: canAccessView('estoque_np') ? <EstoqueNaoPublicitado /> : <Forbidden requestedView="estoque_np" requiredPermission={getRequiredPermission("estoque_np")} />,
    usuarios: canAccessView('usuarios') ? <Usuarios currentUser={user} /> : <Forbidden requestedView="usuarios" requiredPermission={getRequiredPermission("usuarios")} />,
    logs: canAccessView('logs') ? <Logs modo={logsModo} onModoChange={setLogsModo} /> : <Forbidden requestedView="logs" requiredPermission={getRequiredPermission("logs")} />,
  };

  return (
    <AuthProvider
      value={{
        user,
        perfil,
        activeCompanyId: perfil?.empresa_id || user?.user_metadata?.empresa_id || null,
        session: {
          expiresAt: user?.expires_at || null
        }
      }}
    >
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