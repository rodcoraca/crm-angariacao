import { useState, useEffect } from "react";
import { supabase } from "./supabase";

import Login from "./Login";
import Fluxo from "./Fluxo";
import Dashboard from "./Dashboard";
import LeadsPorTipo from "./LeadsPorTipo";
import MensagensPadrao from "./MensagensPadrao";

export default function App() {

  const [user, setUser] = useState(null);
  const [view, setView] = useState("fluxo");

  //////////////////////////////////////////////////////
  // 🔐 AUTENTICAÇÃO

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

  //////////////////////////////////////////////////////
  // 🚪 LOGOUT

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  //////////////////////////////////////////////////////
  // 🔒 LOGIN

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  //////////////////////////////////////////////////////
  // 🖥️ APP

 return (
  <div style={container}>

    {/* SIDEBAR */}
    <div style={sidebar}>

      <div style={logo}>
        ERA CRM
      </div>

      <button
        style={btnMenu}
        onClick={() => setView("fluxo")}
      >
        📞 Fluxo
      </button>

      <button
        style={btnMenu}
        onClick={() => setView("dashboard")}
      >
        📊 Leads - Todos
      </button>

      <button
        style={btnMenu}
        onClick={() => setView("quente")}
      >
        🔥 Quentes
      </button>

      <button
        style={btnMenu}
        onClick={() => setView("morno")}
      >
        🟡 Mornos
      </button>

      <button
        style={btnMenu}
        onClick={() => setView("frio")}
      >
        ❄️ Frios
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

    </div>

    {/* ÁREA PRINCIPAL */}
    <div style={main}>

      {/* TOPO */}
      <div style={topbar}>
        ERA - Casa da Música | CRM Interno
      </div>

      {/* CONTEÚDO */}
      <div style={content}>

        {view === "fluxo" && (
          <Fluxo user={user} />
        )}

        {view === "dashboard" && (
          <Dashboard />
        )}

        {view === "quente" && (
          <LeadsPorTipo tipo="quente" />
        )}

        {view === "morno" && (
          <LeadsPorTipo tipo="morno" />
        )}

        {view === "frio" && (
          <LeadsPorTipo tipo="frio" />
        )}

        {view === "mensagens" && (
          <MensagensPadrao />
        )}

      </div>

    </div>

  </div>
);

      {/* 🔽 CONTEÚDO */}
      <div style={content}>

        {view === "fluxo" && (
          <Fluxo user={user} />
        )}

        {view === "dashboard" && (
          <Dashboard />
        )}

        {view === "quente" && (
          <LeadsPorTipo tipo="quente" />
        )}

        {view === "morno" && (
          <LeadsPorTipo tipo="morno" />
        )}

        {view === "frio" && (
          <LeadsPorTipo tipo="frio" />
        )}

        {view === "mensagens" && (
          <MensagensPadrao />
        )}

      </div>

    </div>
  );
}

const container = {
  display: "flex",
  fontFamily: "Arial",
  background: "#f1f5f9",
  minHeight: "100vh"
};

const sidebar = {
  width: "230px",
  background: "white",
  borderRight: "1px solid #e2e8f0",

  position: "fixed",
  left: 0,
  top: 0,

  height: "100vh",

  padding: "20px",

  boxSizing: "border-box",

  display: "flex",
  flexDirection: "column",
  gap: "10px"
};

const logo = {
  fontSize: "22px",
  fontWeight: "bold",
  marginBottom: "20px",
  color: "#1e293b"
};

const main = {
  marginLeft: "230px",
  width: "100%"
};

const topbar = {
  height: "60px",

  background: "#1e293b",
  color: "white",

  display: "flex",
  alignItems: "center",

  padding: "0 20px",

  position: "fixed",
  top: 0,
  left: "230px",
  right: 0,

  zIndex: 1000,

  boxSizing: "border-box",

  boxShadow: "0 2px 10px rgba(0,0,0,0.15)"
};

const content = {
  padding: "80px 20px 20px 20px"
};

const btnMenu = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",

  padding: "12px",

  borderRadius: "8px",

  cursor: "pointer",

  textAlign: "left",

  fontWeight: "600"
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