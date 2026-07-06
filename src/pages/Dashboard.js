import { useTheme } from "../theme/ThemeContext";
import Button from "../components/Button";
import Input from "../Input";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Table from "../components/ui/Table";
import EmptyState from "../components/ui/EmptyState";
import Loading from "../components/ui/Loading";
import { useDashboardLeads } from "../modules/leads/hooks";

export default function Dashboard({ onAbrirLead }) {
  const theme = useTheme();

  const styles = {
    page: {
      display: "grid",
      gap: theme.spacing.lg
    },
    executiveHeader: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.md,
      padding: theme.spacing.lg
    },
    executiveTitleBlock: {
      display: "grid",
      gap: theme.spacing.xs
    },
    executiveTitle: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "1.9rem",
      lineHeight: 1.1
    },
    executiveSubtitle: {
      margin: 0,
      color: theme.colors.muted,
      lineHeight: 1.45
    },
    executiveKpiGrid: {
      display: "grid",
      gap: theme.spacing.md,
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
    },
    executiveKpiCard: {
      padding: theme.spacing.md,
      display: "grid",
      gap: theme.spacing.xs
    },
    executiveKpiLabel: {
      margin: 0,
      color: theme.colors.muted,
      fontSize: "0.85rem",
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      fontWeight: 700
    },
    executiveKpiValue: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "1.75rem",
      lineHeight: 1,
      fontWeight: 700
    },
    executiveLayout: {
      display: "grid",
      gap: theme.spacing.md,
      gridTemplateColumns: "2fr 1fr"
    },
    executiveSide: {
      display: "grid",
      gap: theme.spacing.md
    },
    sectionCard: {
      padding: theme.spacing.lg,
      display: "grid",
      gap: theme.spacing.sm,
      minHeight: "220px"
    },
    sectionTitle: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "1.05rem"
    },
    sectionDescription: {
      margin: 0,
      color: theme.colors.muted,
      fontSize: "0.95rem"
    },
    dividerTitle: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "1.15rem"
    },
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

  const {
    filtroTipo,
    busca,
    leadSelecionado,
    dados,
    setFiltroTipo,
    setBusca,
    setLeadSelecionado,
    exportarCSV,
    getInteractiveCellProps,
    formatarData
  } = useDashboardLeads({ onAbrirLead, theme });

  const isLoading = false;
  const emptyStateMessage = (
    <EmptyState
      title="Sem leads para mostrar"
      description="Não existem registos para os filtros aplicados."
      style={{ padding: theme.spacing.md, boxShadow: "none", border: "none", background: "transparent" }}
    />
  );

  const tableColumns = [
    {
      key: "nome",
      title: "Nome",
      render: (lead) => (
        <span
          style={{ ...styles.tdNome, padding: 0, cursor: "pointer" }}
          {...getInteractiveCellProps(lead)}
        >
          {lead.nome}
        </span>
      )
    },
    {
      key: "telefone",
      title: "Telefone",
      render: (lead) => (
        <span
          style={{ ...styles.td, padding: 0, cursor: "pointer" }}
          {...getInteractiveCellProps(lead)}
        >
          {lead.telefone}
        </span>
      )
    },
    {
      key: "tipo",
      title: "Tipo",
      render: (lead) => (
        <span
          style={{ ...styles.td, padding: 0, cursor: "pointer" }}
          {...getInteractiveCellProps(lead)}
        >
          {renderTipo(lead.tipo)}
        </span>
      )
    },
    {
      key: "updated_at",
      title: "Data",
      render: (lead) => (
        <span
          style={{ ...styles.td, padding: 0, cursor: "pointer" }}
          {...getInteractiveCellProps(lead)}
        >
          {formatarData(lead.updated_at)}
        </span>
      )
    }
  ];

  function renderTipo(tipo) {
    const base = {
      padding: "4px 8px",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: "600"
    };

    if (tipo === "quente") {
      return <Badge style={{ ...base, background: "#dcfce7", color: "#166534" }}>🔥 Quente</Badge>;
    }

    if (tipo === "morno") {
      return <Badge style={{ ...base, background: "#fef9c3", color: "#92400e" }}>🟡 Morno</Badge>;
    }

    return <Badge style={{ ...base, background: "#fee2e2", color: "#991b1b" }}>❄️ Frio</Badge>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerContainer}>
        <div style={styles.titleWrapper}>
          <h2 style={styles.pageTitle}>📊 Administração</h2>
          <p style={styles.pageSubtitle}>Gestão operacional das leads.</p>
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
        {isLoading ? (
          <Loading label="A carregar leads..." />
        ) : (
          <Table columns={tableColumns} rows={dados} emptyMessage={emptyStateMessage} />
        )}
      </div>
    </div>
  );
}
