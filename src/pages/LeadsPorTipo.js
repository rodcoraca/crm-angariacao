import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import FichaLead from "../FichaLead";
import { useTheme } from "../theme/ThemeContext";
import { formatarNomeApresentacao } from "../utils/nomes";

export default function LeadsPorTipo({ tipo, user, onAbrirLead }) {
  const theme = useTheme();
  const [leads, setLeads] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [leadSelecionadoId, setLeadSelecionadoId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    carregar();
  }, [tipo, refreshKey]);

  async function carregar() {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("tipo", tipo)
      .order("created_at", { ascending: false });

    if (!error) {
      setLeads(data || []);
      carregarAgentes(data || []);
    }
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
    if (agente) return formatarNomeApresentacao(agente.nome);
    if (id === user?.id) return formatarNomeApresentacao(nomeUtilizadorAtual());
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
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (!error) {
      setRefreshKey((value) => value + 1);
    }
  }

  async function salvarObservacao(id, texto) {
    const { error } = await supabase
      .from("leads")
      .update({
        observacoes: texto,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      setRefreshKey((value) => value + 1);
    }
  }

  function abrirFicha(leadId) {
    setLeadSelecionadoId(leadId);
    onAbrirLead?.(leadId);
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

  if (leadSelecionadoId) {
    return (
      <div>
        <button style={{ ...btnVoltar, background: theme.colors.surfaceSoft, border: `1px solid ${theme.colors.border}`, color: theme.colors.text }} onClick={() => setLeadSelecionadoId(null)}>
          ← Voltar para a lista
        </button>
        <FichaLead
          leadId={leadSelecionadoId}
          user={user}
          voltar={() => {
            setLeadSelecionadoId(null);
            setRefreshKey((value) => value + 1);
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: theme.colors.primary }}>{emojiTipo(tipo)} {tipo.toUpperCase()}</h2>

      <div style={wrapper}>
        <div style={grid}>
          {leads.map((lead) => (
            <div
              key={lead.id}
              style={{ ...card(lead.tipo), cursor: "pointer" }}
              role="button"
              tabIndex={0}
              onClick={() => abrirFicha(lead.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  abrirFicha(lead.id);
                }
              }}
            >
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
                style={{ ...textarea, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface }}
                value={lead.observacoes || ""}
                onChange={(e) => atualizarObsLocal(lead.id, e.target.value)}
                onBlur={(e) => salvarObservacao(lead.id, e.target.value)}
                onClick={(event) => event.stopPropagation()}
                placeholder="Adicionar observações..."
              />

	      <select
                value={lead.tipo}
                onChange={(e) => alterarTipo(lead.id, e.target.value)}
                onClick={(event) => event.stopPropagation()}
                style={{ ...select, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface }}
              >
                <option value="quente">🔥 Quente</option>
                <option value="morno">🟡 Morno</option>
                <option value="frio">❄️ Frio</option>
              </select>

              <button
                style={{ ...btnFicha, background: theme.colors.primary }}
                onClick={(event) => {
                  event.stopPropagation();
                  abrirFicha(lead.id);
                }}
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
  boxSizing: "border-box",
  marginTop: "10px",
  padding: "8px",
  borderRadius: "6px",
  fontSize: "13px",
  resize: "none",
  overflowY: "auto",
  height: "100px"
};

const btnFicha = {
  marginTop: "10px",
  width: "100%",
  padding: "8px",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "600"
};

const btnVoltar = {
  marginBottom: "16px",
  padding: "8px 12px",
  borderRadius: "6px",
  cursor: "pointer",
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
