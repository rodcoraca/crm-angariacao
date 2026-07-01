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

        <div style={logo}>ERA CRM</div>

        <button style={btnMenu} onClick={() => setView("fluxo")}>📞 Fluxo</button>
        <button style={btnMenu} onClick={() => setView("dashboard")}>📊 Leads - Todos</button>
        <button style={btnMenu} onClick={() => setView("quente")}>🔥 Quentes</button>
        <button style={btnMenu} onClick={() => setView("morno")}>🟡 Mornos</button>
        <button style={btnMenu} onClick={() => setView("frio")}>❄️ Frios</button>
        <button style={btnMenu} onClick={() => setView("mensagens")}>📩 Mensagens</button>

        <button style={btnLogout} onClick={logout}>🚪 Sair</button>

      </div>

      {/* ÁREA PRINCIPAL */}
      <div style={main}>

        {/* TOPO */}
        <div style={topbar}>
          EOSFlow - Fluxo inteligente | Resultados reais.
        </div>

        {/* CONTEÚDO */}
        <div style={content}>

          {view === "fluxo" && <Fluxo user={user} />}
          {view === "dashboard" && <Dashboard />}
          {view === "quente" && <LeadsPorTipo tipo="quente" />}
          {view === "morno" && <LeadsPorTipo tipo="morno" />}
          {view === "frio" && <LeadsPorTipo tipo="frio" />}
          {view === "mensagens" && <MensagensPadrao />}

        </div>

      </div>

    </div>
  );
}
