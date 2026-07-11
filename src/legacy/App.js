import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { theme } from "./theme/theme";
import { ThemeProvider } from "./theme/ThemeContext";
import Layout from "./components/Layout";
import SidebarMenu from "./SidebarMenu";
import Topbar from "./Topbar";

import logo from "./assets/logo.png";
import Login from "./Login";
import Fluxo from "./Fluxo";
import Dashboard from "./Dashboard";
import LeadsPorTipo from "./LeadsPorTipo";
import MensagensPadrao from "./MensagensPadrao";
import EstoqueNaoPublicitado from "./EstoqueNaoPublicitado";
import Documentos from "./Documentos";
import FichaLead from "./FichaLead";
import { initScheduler } from "./services/scheduler/syncScheduler";

initScheduler();

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("fluxo");
  const [menuLeadsAberto, setMenuLeadsAberto] = useState(false);
  const [menuEstoqueAberto, setMenuEstoqueAberto] = useState(false);
  const [leadFichaId, setLeadFichaId] = useState(null);
  const [viewAnteriorFicha, setViewAnteriorFicha] = useState("dashboard");

  //////////////////////////////////////////////////////
  // AUTENTICAÇÃO

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  function abrirFichaLead(id) {
    setViewAnteriorFicha(view);
    setLeadFichaId(id);
    setView("ficha_lead");
  }

  function voltarFichaLead() {
    setLeadFichaId(null);
    setView(viewAnteriorFicha || "dashboard");
  }

  //////////////////////////////////////////////////////
  // LOGOUT

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  //////////////////////////////////////////////////////
  // LOGIN

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  //////////////////////////////////////////////////////
  // APP

  return (
    <ThemeProvider>
      <Layout
        header={
          <Topbar>OSFlow - Fluxo inteligente | Resultados reais.</Topbar>
        }
        sidebar={
          <SidebarMenu
            logo={logo}
            onSelectView={setView}
            menuLeadsAberto={menuLeadsAberto}
            toggleLeads={() => setMenuLeadsAberto(!menuLeadsAberto)}
            menuEstoqueAberto={menuEstoqueAberto}
            toggleEstoque={() => setMenuEstoqueAberto(!menuEstoqueAberto)}
            logout={logout}
          />
        }
      >
        <div style={content}>
        {view === "fluxo" && <Fluxo user={user} onAbrirLead={abrirFichaLead} />}
        {view === "dashboard" && <Dashboard onAbrirLead={abrirFichaLead} />}
        {view === "quente" && <LeadsPorTipo tipo="quente" user={user} onAbrirLead={abrirFichaLead} />}
        {view === "morno" && <LeadsPorTipo tipo="morno" user={user} onAbrirLead={abrirFichaLead} />}
        {view === "frio" && <LeadsPorTipo tipo="frio" user={user} onAbrirLead={abrirFichaLead} />}
        {view === "mensagens" && <MensagensPadrao voltar={() => setView("fluxo")} />}
        {view === "estoque_np" && <EstoqueNaoPublicitado />}
        {view === "documentos" && <Documentos />}
        {view === "ficha_lead" && leadFichaId && (
          <FichaLead leadId={leadFichaId} user={user} voltar={voltarFichaLead} />
        )}
      </div>
    </Layout>
  </ThemeProvider>
  );
}

const content = {
  padding: `20px ${theme.spacing.lg} ${theme.spacing.lg}`
};