import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Dashboard({ onAbrirLead }) {

  const [leads, setLeads] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [busca, setBusca] = useState("");
  const [leadSelecionado, setLeadSelecionado] = useState(null);

  useEffect(() => {
    carregarLeads();
  }, []);

  async function carregarLeads() {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    setLeads(data || []);
  }

  function filtrarLeads() {
    return leads.filter((l) => {
      return (
        (filtroTipo ? l.tipo === filtroTipo : true) &&
        (busca ? l.nome?.toLowerCase().includes(busca.toLowerCase()) : true)
      );
    });
  }

  function exportarCSV() {
    const linhas = [
      ["Nome", "Telefone", "Tipo", "Data"],
      ...filtrarLeads().map((l) => [
        l.nome,
        l.telefone,
        l.tipo,
        new Date(l.created_at).toLocaleString()
      ])
    ];

    const csv = linhas.map(l => l.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
  }

  const dados = filtrarLeads();

  function formatarData(data) {
    if (!data) return "-";
    const d = new Date(data);
    if (d.getFullYear() === 1970) return "-";
    return d.toLocaleString("pt-PT");
  }

  function renderTipo(tipo) {
    const base = {
      padding: "4px 8px",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: "600"
    };

    if (tipo === "quente") {
      return <span style={{ ...base, background: "#dcfce7", color: "#166534" }}>🔥 Quente</span>;
    }

    if (tipo === "morno") {
      return <span style={{ ...base, background: "#fef9c3", color: "#92400e" }}>🟡 Morno</span>;
    }

    return <span style={{ ...base, background: "#fee2e2", color: "#991b1b" }}>❄️ Frio</span>;
  }

  return (
    <div>

      <h2 style={{ marginBottom: "20px" }}>📊 Painel Admin</h2>

      {/* FILTROS */}
      <div style={filtros}>
        <input
          placeholder="Buscar por nome"
          style={input}
          onChange={(e) => setBusca(e.target.value)}
        />

        <select
          style={input}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="quente">Quente</option>
          <option value="morno">Morno</option>
          <option value="frio">Frio</option>
        </select>

        <button style={btnExport} onClick={exportarCSV}>
          Exportar CSV
        </button>
      </div>

      {/* MÉTRICAS */}
      <div style={grid}>
        <div style={card}>Total: {dados.length}</div>
        <div style={card}>Quentes: {dados.filter(l => l.tipo === "quente").length}</div>
        <div style={card}>Mornos: {dados.filter(l => l.tipo === "morno").length}</div>
        <div style={card}>Frios: {dados.filter(l => l.tipo === "frio").length}</div>
      </div>

      {/* DETALHE */}
      {leadSelecionado && (
        <div style={cardDetalhe}>
          <div style={headerDetalhe}>
            <strong>{leadSelecionado.nome}</strong>
            <button onClick={() => setLeadSelecionado(null)}>✖</button>
          </div>

          <p><strong>Telefone:</strong> {leadSelecionado.telefone}</p>
          <p><strong>Tipo:</strong> {renderTipo(leadSelecionado.tipo)}</p>
          <p><strong>Origem:</strong> {leadSelecionado.origem}</p>
          <p><strong>Data:</strong> {formatarData(leadSelecionado.updated_at)}</p>

          {leadSelecionado.observacoes && (
            <div style={obsBox}>
              📝 {leadSelecionado.observacoes}
            </div>
          )}
        </div>
      )}

      {/* TABELA */}
      <div style={tableWrapper}>
        <table style={table}>

          <thead>
            <tr>
              <th style={th}>Nome</th>
              <th style={th}>Telefone</th>
              <th style={th}>Tipo</th>
              <th style={th}>Data</th>
            </tr>
          </thead>

          <tbody>
            {dados.map((lead) => (
              <tr
                key={lead.id}
                style={{ ...tr, cursor: "pointer" }}
                onClick={() => onAbrirLead?.(lead.id)}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={(e) => e.currentTarget.style.background = "white"}
              >
                <td style={tdNome}>{lead.nome}</td>
                <td style={td}>{lead.telefone}</td>
                <td style={td}>{renderTipo(lead.tipo)}</td>
                <td style={td}>{formatarData(lead.updated_at)}</td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

    </div>
  );
}

//////////////////////////////////////////////////////
// 🎨 ESTILOS

const filtros = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px"
};

const input = {
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ddd"
};

const btnExport = {
  padding: "10px 15px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer"
};

const grid = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px"
};

const card = {
  background: "white",
  padding: "15px",
  borderRadius: "8px",
  flex: 1,
  boxShadow: "0 3px 8px rgba(0,0,0,0.05)"
};

const tableWrapper = {
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  overflow: "hidden",
  marginTop: "10px"
};

const table = {
  width: "100%",
  borderCollapse: "collapse"
};

const th = {
  textAlign: "left",
  padding: "14px",
  background: "#f1f5f9",
  fontSize: "13px",
  fontWeight: "600",
  color: "#475569"
};

const tr = {
  borderBottom: "1px solid #e2e8f0",
  transition: "0.2s"
};

const td = {
  padding: "14px",
  fontSize: "14px",
  color: "#334155"
};

const tdNome = {
  ...td,
  fontWeight: "600"
};

const cardDetalhe = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
  marginBottom: "20px"
};

const headerDetalhe = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "10px"
};

const obsBox = {
  marginTop: "10px",
  padding: "10px",
  background: "#fef3c7",
  borderRadius: "6px"
};