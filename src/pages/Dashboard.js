import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useTheme } from "../theme/ThemeContext";
import Button from "../components/Button";
import Input from "../Input";
import Card from "../components/Card";

export default function Dashboard({ onAbrirLead }) {
  const theme = useTheme();

  const styles = {
    headerContainer: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: theme.spacing.lg,
      marginBottom: theme.spacing.lg
    },
    titleWrapper: {
      display: "grid",
      gap: theme.spacing.xs
    },
    pageTitle: {
      margin: 0,
      marginBottom: theme.spacing.sm,
      fontSize: "1.75rem",
      lineHeight: 1.1
    },
    pageSubtitle: {
      margin: 0,
      color: theme.colors.muted,
      lineHeight: 1.4
    },
    filtros: {
      display: "flex",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
      alignItems: "center"
    },
    input: {
      flex: "1 1 220px",
      minWidth: "220px"
    },
    select: {
      flex: "0 0 220px",
      minWidth: "220px",
      borderRadius: theme.borderRadius.md,
      border: `1px solid ${theme.colors.border}`,
      padding: theme.spacing.sm,
      background: theme.colors.inputBackground,
      color: theme.colors.text,
      fontSize: theme.typography.fontSize,
      outline: "none"
    },
    btnExport: {
      minWidth: "150px"
    },
    grid: {
      display: "flex",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg
    },
    card: {
      background: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      flex: 1,
      boxShadow: theme.shadow.sm,
      color: theme.colors.text
    },
    tableWrapper: {
      background: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      boxShadow: theme.shadow.md,
      overflow: "hidden",
      marginTop: theme.spacing.md
    },
    table: {
      width: "100%",
      borderCollapse: "collapse"
    },
    th: {
      textAlign: "left",
      padding: "14px",
      background: theme.colors.surfaceSoft,
      fontSize: "13px",
      fontWeight: "600",
      color: theme.colors.muted
    },
    tr: {
      borderBottom: `1px solid ${theme.colors.border}`,
      transition: "0.2s"
    },
    td: {
      padding: "14px",
      fontSize: "14px",
      color: theme.colors.text
    },
    tdNome: {
      padding: "14px",
      fontSize: "14px",
      fontWeight: "600",
      color: theme.colors.text
    },
    cardDetalhe: {
      background: theme.colors.surface,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      boxShadow: theme.shadow.lg,
      marginBottom: theme.spacing.lg
    },
    headerDetalhe: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm
    },
    obsBox: {
      marginTop: theme.spacing.sm,
      padding: theme.spacing.sm,
      background: theme.colors.light,
      borderRadius: theme.borderRadius.sm,
      color: theme.colors.text
    },
    tipoBadge: {
      padding: "4px 10px",
      borderRadius: theme.borderRadius.sm,
      fontSize: "12px",
      fontWeight: 600,
      display: "inline-flex",
      alignItems: "center",
      gap: "6px"
    }
  };

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
    const termo = (busca || "").trim().toLowerCase();

    return leads.filter((l) => {
      const nomeMatch = l.nome?.toLowerCase().includes(termo);
      const telefoneMatch = String(l.telefone || "").replace(/\D/g, "").includes(termo.replace(/\D/g, ""));

      return (
        (filtroTipo ? l.tipo === filtroTipo : true) &&
        (!termo || nomeMatch || telefoneMatch)
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
      <div style={styles.headerContainer}>
        <div style={styles.titleWrapper}>
          <h2 style={styles.pageTitle}>📊 Painel Admin</h2>
          <p style={styles.pageSubtitle}>Visão geral das leads e métricas de conversão.</p>
        </div>

        <Button color="success" style={styles.btnExport} onClick={exportarCSV}>
          Exportar CSV
        </Button>
      </div>

      <div style={styles.filtros}>
        <Input
          placeholder="Buscar por nome ou telefone"
          style={styles.input}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <select
          style={styles.select}
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="quente">Quente</option>
          <option value="morno">Morno</option>
          <option value="frio">Frio</option>
        </select>
      </div>

      <div style={styles.grid}>
        <Card style={styles.card}>Total: {dados.length}</Card>
        <Card style={styles.card}>Quentes: {dados.filter(l => l.tipo === "quente").length}</Card>
        <Card style={styles.card}>Mornos: {dados.filter(l => l.tipo === "morno").length}</Card>
        <Card style={styles.card}>Frios: {dados.filter(l => l.tipo === "frio").length}</Card>
      </div>

      {leadSelecionado && (
        <Card style={styles.cardDetalhe}>
          <div style={styles.headerDetalhe}>
            <strong>{leadSelecionado.nome}</strong>
            <Button color="light" style={{ minWidth: "45px" }} onClick={() => setLeadSelecionado(null)}>
              ✖
            </Button>
          </div>

          <p><strong>Telefone:</strong> {leadSelecionado.telefone}</p>
          <p><strong>Tipo:</strong> {renderTipo(leadSelecionado.tipo)}</p>
          <p><strong>Origem:</strong> {leadSelecionado.origem}</p>
          <p><strong>Data:</strong> {formatarData(leadSelecionado.updated_at)}</p>

          {leadSelecionado.observacoes && (
            <div style={styles.obsBox}>
              📝 {leadSelecionado.observacoes}
            </div>
          )}
        </Card>
      )}

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>Telefone</th>
              <th style={styles.th}>Tipo</th>
              <th style={styles.th}>Data</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((lead) => (
              <tr
                key={lead.id}
                style={{ ...styles.tr, cursor: "pointer" }}
                onClick={() => onAbrirLead?.(lead.id)}
                onMouseEnter={(e) => e.currentTarget.style.background = theme.colors.surfaceSoft}
                onMouseLeave={(e) => e.currentTarget.style.background = theme.colors.surface}
              >
                <td style={styles.tdNome}>{lead.nome}</td>
                <td style={styles.td}>{lead.telefone}</td>
                <td style={styles.td}>{renderTipo(lead.tipo)}</td>
                <td style={styles.td}>{formatarData(lead.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
