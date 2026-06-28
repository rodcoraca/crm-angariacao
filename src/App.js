import { useState, useEffect } from "react";
import { supabase } from "./supabase";

import Login from "./Login";
import Fluxo from "./Fluxo";
import Dashboard from "./Dashboard";
import LeadsPorTipo from "./LeadsPorTipo";
import MensagensPadrao from "./MensagensPadrao";
import EstoqueNaoPublicitado from "./EstoqueNaoPublicitado";
import Documentos from "./Documentos";
import FichaLead from "./FichaLead";

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
    <div style={container}>
      {/* MENU LATERAL */}
      <aside style={sidebar}>
        <div style={logo}>
          <strong>ERA CRM</strong>
        </div>

        <button
          style={btnMenu}
          onClick={() => setView("fluxo")}
        >
          📞 Fluxo
        </button>

        <button
  style={btnMenu}
  onClick={() => setMenuLeadsAberto(!menuLeadsAberto)}
>
  📊 Leads {menuLeadsAberto ? "▼" : "▶"}
</button>

        {menuLeadsAberto && (
          <div style={submenu}>

            <button
              style={btnSubmenu}
              onClick={() => setView("dashboard")}
            >
              📋 Todos
            </button>

            <button
              style={btnSubmenu}
              onClick={() => setView("quente")}
            >
              🔥 Quentes
            </button>

            <button
              style={btnSubmenu}
              onClick={() => setView("morno")}
            >
              🟡 Mornos
            </button>

            <button
              style={btnSubmenu}
              onClick={() => setView("frio")}
            >
              ❄️ Frios
            </button>

          </div>
        )}

        <button
          style={btnMenu}
          onClick={() => setMenuEstoqueAberto(!menuEstoqueAberto)}
        >
          🏡 Estoque {menuEstoqueAberto ? "▼" : "▶"}
        </button>

        {menuEstoqueAberto && (
          <div style={submenu}>

            <button
              style={btnSubmenu}
              onClick={() => setView("estoque_np")}
            >
              📁 Não Publicitado
            </button>

          </div>
        )}

        <button
          style={btnMenu}
          onClick={() => setView("documentos")}
        >
          📁 Documentos
        </button>

        <button
          style={btnMenu}
          onClick={() => setView("mensagens")}
        >
          📩 Mensagens
        </button>

        <button
          style={btnLogout}
          onClick={logout}
        >
          🚪 Sair
        </button>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div style={main}>
        {/* TOPO */}
        <header style={topbar}>
          ERA - Casa da Música | Guião TLMK | CRM Interno
        </header>

        {/* CONTEÚDO */}
        <div style={content}>
          {view === "fluxo" && (
            <Fluxo user={user} />
          )}

          {view === "dashboard" && (
            <Dashboard onAbrirLead={abrirFichaLead} />
          )}

          {view === "quente" && (
            <LeadsPorTipo tipo="quente" user={user} onAbrirLead={abrirFichaLead} />
          )}

          {view === "morno" && (
            <LeadsPorTipo tipo="morno" user={user} onAbrirLead={abrirFichaLead} />
          )}

          {view === "frio" && (
            <LeadsPorTipo tipo="frio" user={user} onAbrirLead={abrirFichaLead} />
          )}

          {view === "mensagens" && (
            <MensagensPadrao
              voltar={() => setView("fluxo")}
            />
          )}
          {view === "estoque_np" && (
            <EstoqueNaoPublicitado />
          )}

          {view === "documentos" && (
            <Documentos />
          )}

          {view === "ficha_lead" && leadFichaId && (
            <FichaLead
              leadId={leadFichaId}
              user={user}
              voltar={voltarFichaLead}
            />
          )}
        </div>
      </div>
    </div>
  );
}

//////////////////////////////////////////////////////
// ESTILOS

const container = {
  display: "flex",
  minHeight: "100vh",
  background: "#f1f5f9",
  fontFamily: "Arial, sans-serif"
};

//////////////////////////////////////////////////////
// SIDEBAR

const sidebar = {
  width: "240px",
  background: "#ffffff",
  borderRight: "1px solid #e2e8f0",

  position: "fixed",
  top: 0,
  left: 0,

  height: "100vh",

  padding: "20px",

  boxSizing: "border-box",

  display: "flex",
  flexDirection: "column",
  gap: "10px",

  boxShadow: "2px 0 10px rgba(0,0,0,0.05)"
};

const logo = {
  marginBottom: "20px",
  paddingBottom: "15px",
  borderBottom: "1px solid #e2e8f0",
  color: "#1e293b",
  fontSize: "20px"
};

//////////////////////////////////////////////////////
// BOTÕES MENU

const btnMenu = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  padding: "12px",
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "left",
  fontWeight: "600",
  fontSize: "14px"
};

const btnLogout = {
  marginTop: "auto",
  background: "#ef4444",
  color: "white",
  border: "none",
  padding: "12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold"
};

//////////////////////////////////////////////////////
// ÁREA PRINCIPAL

const main = {
  marginLeft: "240px",
  width: "calc(100% - 240px)"
};

//////////////////////////////////////////////////////
// TOPBAR

const topbar = {
  position: "fixed",

  top: 0,
  left: "240px",

  width: "calc(100% - 240px)",
  height: "60px",

  background: "#1e293b",
  color: "white",

  display: "flex",
  alignItems: "center",

  padding: "0 20px",

  boxSizing: "border-box",

  zIndex: 1000,

  boxShadow: "0 2px 10px rgba(0,0,0,0.15)",

  fontWeight: "600"
};

//////////////////////////////////////////////////////
// CONTEÚDO

const content = {
  padding: "80px 20px 20px 20px"
};

const submenu = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  marginLeft: "15px"
};

const btnSubmenu = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  padding: "10px",
  borderRadius: "6px",
  cursor: "pointer",
  textAlign: "left",
  fontSize: "13px"
};