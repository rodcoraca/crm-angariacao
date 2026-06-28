import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function LeadsPorTipo({ tipo, user, onAbrirLead }) {
  const [leads, setLeads] = useState([]);
  const [agentes, setAgentes] = useState([]);

  useEffect(() => {
    carregar();
  }, [tipo]);

  async function carregar() {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("tipo", tipo)
      .order("created_at", { ascending: false });
    setLeads(data || []);
    carregarAgentes(data || []);
  }

  async function carregarAgentes(leadsCarregadas) {
    const { data, error } = await supabase
      .from("agentes")
      .select("id,nome,email,ativo")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (!error && data?.length) {
      setAgentes(data.map((a) => ({
        id: a.id,
        nome: a.nome || a.email || a.id,
        email: a.email || ""
      })));
      return;
    }

    const ids = [...new Set((leadsCarregadas || []).map((l) => l.agente_id).filter(Boolean))];
    if (user?.id && !ids.includes(user.id)) ids.push(user.id);

    setAgentes(ids.map((id) => ({
      id,
      nome: id === user?.id ? nomeUtilizadorAtual() : "Agente validado",
      email: id === user?.id ? user?.email || "" : id
    })));
  }

  function nomeUtilizadorAtual() {
    return user?.user_metadata?.nome ||
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      user?.email ||
      "Agente atual";
  }

  function nomeAgente(id) {
    const agente = agentes.find((a) => a.id === id);
    if (agente) return agente.email ? `${agente.nome} (${agente.email})` : agente.nome;
    if (id === user?.id) return nomeUtilizadorAtual();
    return "Sem agente";
  }

  function atualizarObsLocal(id, texto) {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, observacoes: texto } : l
      )
    );
  }

  async function alterarTipo(id, novoTipo) {
  const { error } = await supabase
    .from("leads")
    .update({
      tipo: novoTipo,
      updated_at: new Date().toISOString() // 👈 AQUI
    })
    .eq("id", id);

  if (!error) carregar();
}

async function salvarObservacao(id, texto) {
  const { error } = await supabase
    .from("leads")
    .update({
      observacoes: texto,
      updated_at: new Date().toISOString() // 👈 AQUI
    })
    .eq("id", id);

  if (error) {
    alert(error.message);
  } else {
    // opcional: recarregar lista
    carregar();
  }
}

function formatarData(data) {
  if (!data) return "";

  const d = new Date(data);

  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();

  const hora = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const seg = String(d.getSeconds()).padStart(2, "0");

  return `${dia}/${mes}/${ano} ${hora}:${min}:${seg}`;
}

  return (
    <div>
      <h2>{emojiTipo(tipo)} {tipo.toUpperCase()}</h2>

      <div style={wrapper}>
        <div style={grid}>
          {leads.map((lead) => (
            <div key={lead.id} style={card(lead.tipo)}>
              <div style={header}>
                <strong>{lead.nome}</strong>
                <span>{emojiTipo(lead.tipo)}</span>
              </div>

              <p style={{ margin: "4px 0" }}>{lead.telefone}</p>

		<p style={{ fontSize: "11px", color: "#64748b" }}>
  		{new Date(lead.updated_at).toLocaleString()}
	      </p>

              <p style={dataStyle}>
                📅 Último contacto: {formatarData(lead.updated_at || lead.created_at)}
              </p>

              <p style={agenteStyle}>
                <strong>Agente:</strong> {nomeAgente(lead.agente_id)}
              </p>

              <textarea
                style={textarea}
                value={lead.observacoes || ""}
                onChange={(e) => atualizarObsLocal(lead.id, e.target.value)}
                onBlur={(e) => salvarObservacao(lead.id, e.target.value)} // 👈 AQUI
                placeholder="Adicionar observações..."
              />

	      <select
                value={lead.tipo}
                onChange={(e) => alterarTipo(lead.id, e.target.value)}
                style={select}
              >
                <option value="quente">🔥 Quente</option>
                <option value="morno">🟡 Morno</option>
                <option value="frio">❄️ Frio</option>
              </select>

              <button
                style={btnFicha}
                onClick={() => onAbrirLead?.(lead.id)}
              >
                Editar ficha
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 🔥 ESTILOS

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "20px"
};

const card = (tipo) => ({
  background:
    tipo === "quente"
      ? "#dcfce7"
      : tipo === "morno"
      ? "#fef9c3"
      : "#fee2e2",
  padding: "15px",      // 👈 mais espaço interno
  borderRadius: "10px",
  boxShadow: "0 3px 10px rgba(0,0,0,0.05)",
});

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px"
};

const obsBox = {
  marginTop: "8px",
  padding: "8px",
  background: "#fef3c7",
  borderRadius: "6px",
  fontSize: "12px",
};

const select = {
  marginTop: "10px",
  width: "100%",
  padding: "8px",
};

const wrapper = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "20px"
};

const textarea = {
  width: "100%",
  boxSizing: "border-box",   // 👈 ESSENCIAL
  marginTop: "10px",
  padding: "8px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  fontSize: "13px",
  resize: "none",
  overflowY: "auto",
  height: "100px"
};

const btnFicha = {
  marginTop: "10px",
  width: "100%",
  padding: "8px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "600"
};

const btnSalvar = {
  marginTop: "6px",
  width: "100%",
  padding: "6px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px"
};

function emojiTipo(tipo) {
  if (tipo === "quente") return "🔥";
  if (tipo === "morno") return "🟡";
  return "❄️";
};

const agenteStyle = {
  fontSize: "12px",
  color: "#334155",
  margin: "6px 0"
};

const dataStyle = {
  fontSize: "14px",
  color: "#666666",
  marginTop: "4px"
};
