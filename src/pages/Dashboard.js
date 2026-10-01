import { useCallback, useMemo, useState } from "react";
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
import Modal from "../components/ui/Modal";
import { notifyError, notifySuccess } from "../components/ui/feedbackBus";
import { useDashboardLeads } from "../modules/leads/hooks";
import { transferirLeadsEmLote } from "../modules/leads/services/leadsService";
import { createDashboardStyles } from "./dashboardStyles";
import { LEAD_STATUSES, getLeadStatusLabel, getLeadStatusVariant } from "../modules/leads/statusCatalog";
import { isAllFilteredLeadsSelected, toggleLeadSelection } from "../modules/leads/utils/dashboardState";

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
    refetchLeads,
    getInteractiveCellProps,
    nomeAgente,
    formatarData
  } = useDashboardLeads({ onAbrirLead, theme, user });

  const [leadIdsSelecionadas, setLeadIdsSelecionadas] = useState([]);
  const [bulkTransferOpen, setBulkTransferOpen] = useState(false);
  const [bulkAgenteId, setBulkAgenteId] = useState("");
  const [bulkTransferInFlight, setBulkTransferInFlight] = useState(false);

  const leadsSelecionadasAtuais = useMemo(
    () => leadIdsSelecionadas.filter((leadId) => dados.some((lead) => String(lead.id) === String(leadId))),
    [dados, leadIdsSelecionadas]
  );
  const totalLeadsSelecionadas = leadsSelecionadasAtuais.length;
  const todasFiltradasSelecionadas = isAllFilteredLeadsSelected(dados, leadIdsSelecionadas);

  const toggleLeadSelectionState = useCallback((leadId) => {
    setLeadIdsSelecionadas((prev) => toggleLeadSelection(prev, leadId));
  }, []);

  const limparSelecao = useCallback(() => {
    setLeadIdsSelecionadas([]);
    setBulkAgenteId("");
    setBulkTransferOpen(false);
  }, []);

  const confirmarTransferenciaEmLote = useCallback(async () => {
    if (!leadIdsSelecionadas.length) {
      notifyError("Selecione pelo menos uma lead para transferir.");
      return;
    }

    if (!bulkAgenteId) {
      notifyError("Selecione o novo responsável antes de confirmar.");
      return;
    }

    setBulkTransferInFlight(true);

    try {
      const resultado = await transferirLeadsEmLote({
        leadIds: leadIdsSelecionadas,
        agenteId: bulkAgenteId,
        user
      });

      if (resultado?.totalFalhado > 0) {
        notifyError(
          resultado.totalFalhado === resultado.totalSelecionado
            ? "Não foi possível transferir nenhuma lead selecionada."
            : `Transferidas ${resultado.totalTransferido} de ${resultado.totalSelecionado} leads. Houve ${resultado.totalFalhado} falhas.`
        );
      } else {
        notifySuccess(`Transferidas ${resultado.totalTransferido} leads com sucesso.`);
      }

      await refetchLeads();
      limparSelecao();
    } catch (error) {
      notifyError(error?.message || "Não foi possível transferir as leads selecionadas.");
    } finally {
      setBulkTransferInFlight(false);
    }
  }, [bulkAgenteId, leadIdsSelecionadas, limparSelecao, refetchLeads, user]);

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
      key: "select",
      title: (
        <input
          type="checkbox"
          checked={dados.length > 0 && todasFiltradasSelecionadas}
          onChange={() => {
            if (!dados.length) return;
            const nextIds = todasFiltradasSelecionadas
              ? leadIdsSelecionadas.filter((id) => !dados.some((lead) => String(lead.id) === String(id)))
              : [...new Set([...leadIdsSelecionadas, ...dados.map((lead) => lead.id)])];
            setLeadIdsSelecionadas(nextIds);
          }}
          aria-label="Selecionar todas as leads filtradas"
          disabled={!dados.length}
          style={{ cursor: dados.length ? "pointer" : "not-allowed" }}
        />
      ),
      render: (lead) => (
        <input
          type="checkbox"
          checked={leadIdsSelecionadas.some((id) => String(id) === String(lead.id))}
          onChange={(event) => {
            event.stopPropagation();
            toggleLeadSelectionState(lead.id);
          }}
          aria-label={`Selecionar lead ${lead.nome || lead.id}`}
          onClick={(event) => event.stopPropagation()}
        />
      )
    },
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
  ], [dados, formatarData, getInteractiveCellProps, leadIdsSelecionadas, nomeAgente, renderTipo, styles, toggleLeadSelectionState, todasFiltradasSelecionadas]);

  return (
    <PageLayout style={styles.page}>
      <PageHeader
        title="📊 Administração"
        subtitle="Gestão operacional das leads."
        actions={(
          <div style={{ display: "flex", gap: theme.spacing.sm, alignItems: "center", flexWrap: "wrap" }}>
            {totalLeadsSelecionadas > 0 ? (
              <span style={{ color: theme.colors.muted, fontSize: "0.85rem" }}>
                {totalLeadsSelecionadas} lead{totalLeadsSelecionadas === 1 ? "" : "s"} selecionada{totalLeadsSelecionadas === 1 ? "" : "s"}
              </span>
            ) : null}
            {totalLeadsSelecionadas > 0 ? (
              <Button color="primary" onClick={() => setBulkTransferOpen(true)}>
                Transferir selecionadas
              </Button>
            ) : null}
            <Button color="success" style={styles.btnExport} onClick={exportarCSV}>
              Exportar CSV
            </Button>
          </div>
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

      <Modal
        open={bulkTransferOpen}
        onClose={() => {
          if (!bulkTransferInFlight) {
            setBulkTransferOpen(false);
            setBulkAgenteId("");
          }
        }}
        title="Transferir leads selecionadas"
        size="md"
        footer={(
          <div style={{ display: "flex", justifyContent: "flex-end", gap: theme.spacing.sm }}>
            <Button color="light" onClick={() => {
              if (!bulkTransferInFlight) {
                setBulkTransferOpen(false);
                setBulkAgenteId("");
              }
            }} disabled={bulkTransferInFlight}>
              Cancelar
            </Button>
            <Button color="primary" onClick={confirmarTransferenciaEmLote} disabled={bulkTransferInFlight || !bulkAgenteId}>
              {bulkTransferInFlight ? "A transferir..." : `Transferir ${totalLeadsSelecionadas} lead${totalLeadsSelecionadas === 1 ? "" : "s"}`}
            </Button>
          </div>
        )}
      >
        <div style={{ display: "grid", gap: theme.spacing.md }}>
          <p style={{ margin: 0, color: theme.colors.muted }}>
            Confirma a transferência de {totalLeadsSelecionadas} lead{totalLeadsSelecionadas === 1 ? "" : "s"} para o novo responsável.
          </p>

          <Select
            label="Novo responsável"
            value={bulkAgenteId}
            onChange={(event) => setBulkAgenteId(event.target.value)}
            options={[
              { label: "Selecione um agente", value: "" },
              ...opcoesUtilizador.map((option) => ({ label: option.label, value: option.value }))
            ]}
          />
        </div>
      </Modal>
    </PageLayout>
  );
}
