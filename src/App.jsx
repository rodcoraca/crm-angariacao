import { useState, useEffect } from "react";
import { supabase } from "./supabase";

import Login from "./pages/Login";
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
import { temAcesso } from "./utils/usuarios";

export default function App() {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [view, setView] = useState("fluxo");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leadSelecionadoId, setLeadSelecionadoId] = useState(null);
  const [viewAnteriorFicha, setViewAnteriorFicha] = useState("fluxo");
  const [logsModo, setLogsModo] = useState("geral");

  async function carregarPerfil(email) {
    const { data } = await supabase.from("usuarios").select("*").eq("email", email).maybeSingle();
    if (data) {
      setPerfil({ ...data, permissoes: data.permissoes || {} });
    } else {
      setPerfil({ permissoes: { fluxo: true, dashboard: true, quente: true, morno: true, frio: true, mensagens: true, estoque_np: true, usuarios: false, logs: false } });
    }
  }

  async function logout() {
    setUser(null);
    setPerfil(null);
  }

  function abrirFichaLead(id) {
    setLeadSelecionadoId(id);
    setViewAnteriorFicha(view);
  }

  function mudarView(nextView) {
    if (!temAcesso(perfil, nextView)) {
      alert("Sem permissão para aceder a este módulo.");
      return;
    }
    setView(nextView);
    registrarLog('navegacao', `Acedeu a ${nextView}`);
  }

  function abrirLogs(modo) {
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
    fluxo: temAcesso(perfil, 'fluxo') ? <Fluxo user={user} onAbrirLead={abrirFichaLead} /> : <div>Sem permissão.</div>,
    dashboard: temAcesso(perfil, 'dashboard') ? <Dashboard onAbrirLead={abrirFichaLead} /> : <div>Sem permissão.</div>,
    quente: temAcesso(perfil, 'quente') ? <LeadsPorTipo tipo="quente" user={user} onAbrirLead={abrirFichaLead} /> : <div>Sem permissão.</div>,
    morno: temAcesso(perfil, 'morno') ? <LeadsPorTipo tipo="morno" user={user} onAbrirLead={abrirFichaLead} /> : <div>Sem permissão.</div>,
    frio: temAcesso(perfil, 'frio') ? <LeadsPorTipo tipo="frio" user={user} onAbrirLead={abrirFichaLead} /> : <div>Sem permissão.</div>,
    mensagens: temAcesso(perfil, 'mensagens') ? <MensagensPadrao /> : <div>Sem permissão.</div>,
    estoque_np: temAcesso(perfil, 'estoque_np') ? <EstoqueNaoPublicitado /> : <div>Sem permissão.</div>,
    usuarios: temAcesso(perfil, 'usuarios') ? <Usuarios currentUser={user} /> : <div>Sem permissão.</div>,
    logs: temAcesso(perfil, 'logs') ? <Logs modo={logsModo} onModoChange={setLogsModo} /> : <div>Sem permissão.</div>,
  };

  return (
    <Layout
      collapsed={sidebarCollapsed}
      header={<div>OSFlow - Fluxo inteligente | Resultados reais.</div>}
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
  );
}