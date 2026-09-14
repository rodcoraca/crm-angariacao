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
import { LEAD_STATUSES, getLeadStatusLabel, getLeadStatusVariant } from "../modules/leads/statusCatalog";

export default function Dashboard({ onAbrirLead, user }) {
  const theme = useTheme();
  const styles = useMemo(() => createDashboardStyles(theme), [theme]);

  const {
    filtroTipo,
    filtroStatus,
    filtroUtilizador,
    busca,
    leadSelecionado,
    dados,
    opcoesUtilizador,
    setFiltroTipo,
    setFiltroStatus,
    setFiltroUtilizador,
    setBusca,
    setLeadSelecionado,
    exportarCSV,
    getInteractiveCellProps,
    nomeAgente,
    formatarData
  } = useDashboardLeads({ onAbrirLead, theme, user });

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
      key: "status",
      title: "Estado",
      render: (lead) => (
        <span style={{ ...styles.td, ...styles.clickableCell }} {...getInteractiveCellProps(lead)}>
          <Badge variant={getLeadStatusVariant(lead.status)}>{getLeadStatusLabel(lead.status)}</Badge>
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
    },
    {
      key: "agente_id",
      title: "Agente",
      render: (lead) => (
        <span
          style={{ ...styles.td, ...styles.clickableCell }}
          {...getInteractiveCellProps(lead)}
        >
          {nomeAgente(lead.agente_id)}
        </span>
      )
    }
  ], [formatarData, getInteractiveCellProps, nomeAgente, renderTipo, styles]);

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
            label="Nome ou telefone"
            placeholder="Nome ou telefone"
            style={styles.input}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <Select
            label="Tipo"
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
            label="Estado"
            style={styles.select}
            selectStyle={styles.select}
            options={[{ label: "Todos", value: "" }, ...LEAD_STATUSES]}
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          />

          <Select
            label="Utilizador"
            style={styles.select}
            selectStyle={styles.select}
            options={[
              { label: "Todos os utilizadores", value: "" },
              ...opcoesUtilizador.map((option) => ({ label: option.label, value: option.value }))
            ]}
            value={filtroUtilizador}
            onChange={(e) => setFiltroUtilizador(e.target.value)}
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
          <p><strong>Estado:</strong> <Badge variant={getLeadStatusVariant(leadSelecionado.status)}>{getLeadStatusLabel(leadSelecionado.status)}</Badge></p>
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
