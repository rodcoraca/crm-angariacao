import { useState, useEffect } from "react";
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
import { registrarLogout, registrarAcessoNegado } from "./modules/audit/services";

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

  async function carregarPerfil(email) {
    const { data } = await supabase.from("usuarios").select("*").eq("email", email).maybeSingle();
    if (data) {
      setPerfil({ ...data, permissoes: data.permissoes || {} });
    } else {
      setPerfil({ permissoes: { fluxo: true, dashboard: true, quente: true, morno: true, frio: true, mensagens: true, estoque_np: true, usuarios: false, logs: false } });
    }
  }

  async function logout() {
    await registrarLogout({
      userId: user?.id || null,
      empresaId: perfil?.empresa_id || user?.user_metadata?.empresa_id || null,
      modulo: "auth",
      entidade: "usuarios",
      entidadeId: user?.id || null,
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
      registrarLog('navegacao', `Acedeu a documentacao (${docsMap[nextView]})`);
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
    registrarLog("acesso_negado", `Tentativa de acesso a ${requestedView}. Permissao: ${requiredPermission || "n/a"}. Motivo: ${reason || "sem detalhe"}`);
    await registrarAcessoNegado({
      userId: user?.id || null,
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
    registrarLog('navegacao', `Acedeu a logs (${modo === 'utilizadores' ? 'por utilizador' : 'geral'})`);
  }

  async function registrarLog(acao, detalhes) {
    if (!user?.id) return;
    await supabase.from('logs_navegacao').insert([{ usuario_id: user.id, acao, detalhes, created_at: new Date().toISOString() }]);
  }

  function voltarDaFicha() {
    setLeadSelecionadoId(null);
    setView(viewAnteriorFicha);
  }

  function handleLogin(usuario) {
    setUser(usuario);
    carregarPerfil(usuario.email);
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            <span style={{ color: "#F97316" }}>OSFlow</span>
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.9rem", textTransform: "none", letterSpacing: "0.02em" }}>Fluxo inteligente | Resultados reais</span>
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
    </AuthProvider>
  );
}