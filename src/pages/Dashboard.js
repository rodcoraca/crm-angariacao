import { useCallback, useMemo } from "react";
import { useTheme } from "../theme/ThemeContext";
import Button from "../components/Button";
import Input from "../Input";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Table from "../components/ui/Table";
import EmptyState from "../components/ui/EmptyState";
import Loading from "../components/ui/Loading";
import PageHeader from "../components/ui/PageHeader";
import Section from "../components/ui/primitives/Section";
import PageLayout from "../components/ui/primitives/PageLayout";
import Select from "../components/ui/Select";
import { useDashboardLeads } from "../modules/leads/hooks";
import { createDashboardStyles } from "./dashboardStyles";

export default function Dashboard({ onAbrirLead }) {
  const theme = useTheme();
  const styles = useMemo(() => createDashboardStyles(theme), [theme]);

  const {
    filtroTipo,
    filtroOrigem,
    busca,
    leadSelecionado,
    dados,
    opcoesFiltroOrigem,
    setFiltroTipo,
    setFiltroOrigem,
    setBusca,
    setLeadSelecionado,
    exportarCSV,
    getInteractiveCellProps,
    formatarData
  } = useDashboardLeads({ onAbrirLead, theme });

  const isLoading = false;
  const emptyStateMessage = useMemo(() => (
    <EmptyState
      title="Sem leads para mostrar"
      description="Não existem registos para os filtros aplicados."
      style={{ padding: theme.spacing.md, boxShadow: "none", border: "none", background: "transparent" }}
    />
  ), [theme]);

  const renderTipo = useCallback((tipo) => {
    const base = styles.tipoBadge;

    if (tipo === "quente") {
      return <Badge variant="success" style={base}>🔥 Quente</Badge>;
    }

    if (tipo === "morno") {
      return <Badge variant="warning" style={base}>🟡 Morno</Badge>;
    }

    return <Badge variant="danger" style={base}>❄️ Frio</Badge>;
  }, [styles.tipoBadge]);

  const tableColumns = useMemo(() => [
    {
      key: "nome",
      title: "Nome",
      render: (lead) => (
        <span
          style={{ ...styles.tdNome, ...styles.clickableCell }}
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
          style={{ ...styles.td, ...styles.clickableCell }}
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
          style={{ ...styles.td, ...styles.clickableCell }}
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
          style={{ ...styles.td, ...styles.clickableCell }}
          {...getInteractiveCellProps(lead)}
        >
          {formatarData(lead.updated_at)}
        </span>
      )
    }
  ], [formatarData, getInteractiveCellProps, renderTipo, styles]);

  return (
    <PageLayout style={styles.page}>
      <PageHeader
        title="📊 Administração"
        subtitle="Gestão operacional das leads."
        actions={(
          <Button color="success" style={styles.btnExport} onClick={exportarCSV}>
            Exportar CSV
          </Button>
        )}
      />

      <Section>
        <div style={styles.filtros}>
          <Input
            placeholder="Buscar por nome ou telefone"
            style={styles.input}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <Select
            style={styles.select}
            selectStyle={styles.select}
            options={[
              { label: "Todos", value: "" },
              { label: "Quente", value: "quente" },
              { label: "Morno", value: "morno" },
              { label: "Frio", value: "frio" }
            ]}
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          />

          <Select
            style={styles.select}
            selectStyle={styles.select}
            options={[
              { label: "Todas as origens", value: "" },
              ...opcoesFiltroOrigem
                .filter((option) => option.value)
                .map((option) => ({ label: option.label, value: option.value }))
            ]}
            value={filtroOrigem}
            onChange={(e) => setFiltroOrigem(e.target.value)}
          />
        </div>
      </Section>

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

      <Section>
        <div style={styles.tableWrapper}>
          {isLoading ? (
            <Loading label="A carregar leads..." />
          ) : (
            <Table columns={tableColumns} rows={dados} emptyMessage={emptyStateMessage} />
          )}
        </div>
      </Section>
    </PageLayout>
  );
}
