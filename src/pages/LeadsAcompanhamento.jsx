import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import Button from "../components/Button";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import Loading from "../components/ui/Loading";
import Select from "../components/ui/Select";
import { notifyError } from "../components/ui/feedbackBus";
import { LEAD_STATUSES } from "../modules/leads/statusCatalog";
import { carregarAcompanhamentoLeads } from "../modules/leads/services";
import { formatActivityDate, formatActivityType, formatAgentName, getActivityDetailLines } from "../modules/leads/utils/leadsAcompanhamentoFormatter";
import "./LeadsAcompanhamento.css";

const PAGE_SIZE = 25;
const ACTIVITY_OPTIONS = [
  { value: "Importação", label: "Lead — Importada" },
  { value: "Atribuição", label: "Lead — Responsável atribuído" },
  { value: "Alteração de status", label: "Lead — Estado alterado" },
  { value: "Alteração de tipo", label: "Lead — Tipo alterado" },
  { value: "Criação", label: "Lead — Criada" },
  { value: "Operação", label: "Lead — Dados alterados" },
  { value: "Lembrete criado", label: "Lembrete — Criado" },
  { value: "Lembrete alterado", label: "Lembrete — Alterado" },
  { value: "Lembrete concluído", label: "Lembrete — Concluído" }
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date, days) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function ActivityDetails({ activity }) {
  return (
    <div className="leads-acompanhamento__activity-details">
      {getActivityDetailLines(activity).map((line) => (
        <div className="leads-acompanhamento__activity-detail" key={`${line.label}-${line.value}`}>
          <strong>{line.label}:</strong> {line.value}
        </div>
      ))}
    </div>
  );
}

function LeadLink({ activity, onAbrirLead }) {
  const label = activity.lead_name || (activity.lead_id ? "Lead" : "Sem Lead");
  if (!activity.lead_id) return label;

  return (
    <button
      type="button"
      onClick={() => onAbrirLead?.(activity.lead_id)}
      style={{ border: 0, background: "transparent", padding: 0, color: "inherit", cursor: "pointer", fontWeight: 600, textAlign: "left" }}
    >
      {label}
    </button>
  );
}

export default function LeadsAcompanhamento({ user, onAbrirLead }) {
  const theme = useTheme();
  const [filters, setFilters] = useState({ dateFrom: addDays(today(), -29), dateTo: today(), userId: "", origin: "", status: "", activity: "" });
  const [selectedUser, setSelectedUser] = useState("");
  const [report, setReport] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const invalidDateRange = Boolean(filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo);

  useEffect(() => {
    if (invalidDateRange) {
      setLoading(false);
      setReport(null);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError(null);
    carregarAcompanhamentoLeads({ user, filtros: filters, page, pageSize: PAGE_SIZE }).then((result) => {
      if (!active) return;
      if (result.error) {
        setError(result.error);
        notifyError(result.error.message || "Não foi possível carregar o acompanhamento.");
        setReport(null);
      } else {
        setReport(result.data);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [filters, invalidDateRange, page, user]);

  const kpis = report?.kpis || {};
  const globalKpis = useMemo(() => report?.global_kpis || {}, [report]);
  const reminderState = report?.reminder_state || {};
  const agents = useMemo(() => report?.global_agents || [], [report]);
  const activities = useMemo(() => report?.activities || [], [report]);
  const statusSnapshot = useMemo(() => ({
    total: Number(globalKpis.total || 0),
    newCount: Number(globalKpis.new || 0),
    accompanied: Number(globalKpis.accompanied || 0),
    statusCounts: globalKpis.status_counts || {}
  }), [globalKpis]);
  const totalPages = Math.max(1, Math.ceil(Number(kpis.total || 0) / PAGE_SIZE));
  const userOptions = useMemo(() => agents.map((item) => ({ value: item.user_id || "unassigned", label: formatAgentName(item.user_name) })), [agents]);
  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const applyShortcut = (name) => {
    const end = today();
    const from = name === "today" ? end : name === "7" ? addDays(end, -6) : addDays(end, -29);
    updateFilter("dateFrom", from);
    updateFilter("dateTo", end);
  };
  const selectUser = (userId) => {
    const next = userId === "system" ? "" : userId;
    setSelectedUser(userId);
    updateFilter("userId", next);
  };

  const primaryKpis = [
    ["Total", statusSnapshot.total],
    ["Novas", statusSnapshot.newCount],
    ["Em acompanhamento", statusSnapshot.accompanied]
  ];
  const operationalKpis = [
    ["Leads importadas", globalKpis.imported],
    ["Alterações de status", kpis.status_changed],
    ["Lembretes criados", kpis.reminders_created],
    ["Lembretes concluídos", kpis.reminders_completed],
    ["Lembretes pendentes", reminderState.pending],
    ["Lembretes vencidos", reminderState.overdue]
  ];
  const statusKpis = LEAD_STATUSES.filter(({ value }) => value !== "novo" && statusSnapshot.statusCounts[value] !== undefined);
  const activityColumns = [
    { key: "created_at", title: "Data/Hora", width: "15%", render: (activity) => formatActivityDate(activity.created_at) },
    { key: "actor_name", title: "Executado por", width: "14%", render: (activity) => formatAgentName(activity.actor_name) },
    { key: "lead_name", title: "Lead", width: "19%", render: (activity) => <LeadLink activity={activity} onAbrirLead={onAbrirLead} /> },
    { key: "activity_type", title: "O que aconteceu", width: "18%", render: (activity) => <Badge variant="primary" size="sm">{formatActivityType(activity.activity_type)}</Badge> },
    { key: "details", title: "Detalhes", width: "34%", sortable: false, render: (activity) => <ActivityDetails activity={activity} /> }
  ];

  return (
    <div className="leads-acompanhamento" style={{ display: "grid", gap: theme.spacing.lg }}>
      <header className="leads-acompanhamento__header">
        <h1 style={{ margin: 0, color: theme.colors.text, fontSize: theme.typography.h1.fontSize }}>Acompanhamento</h1>
        <p style={{ margin: 0, color: theme.colors.muted }}>Atividade operacional sobre Leads por utilizador.</p>
      </header>

      <Card variant="soft">
        <div className="leads-acompanhamento__filters">
          <Input label="Período inicial" type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
          <Input label="Período final" type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
          <Select label="Responsável atual" value={filters.userId} onChange={(event) => updateFilter("userId", event.target.value)} placeholder="Todos" options={userOptions} />
          <Input label="Origem" value={filters.origin} onChange={(event) => updateFilter("origin", event.target.value)} placeholder="Todas" />
          <Select label="Status" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} placeholder="Todos" options={LEAD_STATUSES.map((item) => ({ value: item.value, label: item.label }))} />
          <Select label="O que aconteceu" value={filters.activity} onChange={(event) => updateFilter("activity", event.target.value)} placeholder="Todos" options={ACTIVITY_OPTIONS} />
        </div>
        <div className="leads-acompanhamento__shortcuts">
          <Button color="light" onClick={() => applyShortcut("today")}>Hoje</Button>
          <Button color="light" onClick={() => applyShortcut("7")}>Últimos 7 dias</Button>
          <Button color="light" onClick={() => applyShortcut("30")}>Últimos 30 dias</Button>
          <Button color="light" onClick={() => { const now = new Date(); updateFilter("dateFrom", new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)); updateFilter("dateTo", today()); }}>Este mês</Button>
        </div>
      </Card>

      {invalidDateRange ? <EmptyState title="Período inválido" description="A data inicial deve ser anterior ou igual à data final." /> : loading ? <Loading label="A carregar acompanhamento..." /> : error ? <EmptyState title="Não foi possível carregar" description={error.message} /> : (
        <>
          <div className="leads-acompanhamento__kpis">
            {[...primaryKpis, ...operationalKpis].map(([label, value]) => (
              <Card key={label} variant="soft" className="leads-acompanhamento__kpi">
                <span className="leads-acompanhamento__kpi-label">{label}</span>
                <strong className="leads-acompanhamento__kpi-value">{value === null || value === undefined ? "—" : Number(value).toLocaleString("pt-PT")}</strong>
              </Card>
            ))}
          </div>

          {statusKpis.length ? <div className="leads-acompanhamento__status-kpis" aria-label="Contagem por status">
            {statusKpis.map(({ value, label }) => <span className="leads-acompanhamento__status-kpi" key={value}><span>{label}</span><strong>{statusSnapshot.statusCounts[value]}</strong></span>)}
          </div> : null}
          {Number(globalKpis.imported_unlinked || 0) > 0 ? <div className="leads-acompanhamento__status-kpis" aria-label="Anomalias de importação">
            <span className="leads-acompanhamento__status-kpi"><span>Importações sem Lead CRM</span><strong>{globalKpis.imported_unlinked}</strong></span>
          </div> : null}

          <Card className="leads-acompanhamento__section">
            <h2 style={{ margin: 0, fontSize: theme.typography.cardTitle.fontSize }}>Atividade por utilizador</h2>
            {agents.length === 0 ? <EmptyState variant="compact" title="Sem Leads" description="Não existem Leads na carteira selecionada." /> : <DataTable
              columns={[
                { key: "user_name", title: "Responsável atual", width: "28%", render: (item) => formatAgentName(item.user_name) },
                { key: "portfolio_total", title: "Leads na carteira" },
                { key: "portfolio_new", title: "Novas" },
                { key: "portfolio_accompanied", title: "Acompanhadas" }
              ]}
              rows={agents}
              rowKey={(item) => item.user_id || "unassigned"}
              compact
              onRowClick={(item) => selectUser(item.user_id || "unassigned")}
              rowProps={(item) => ({ style: { background: selectedUser === (item.user_id || "unassigned") ? theme.colors.surfaceSoft : undefined } })}
            />}
          </Card>

          <Card className="leads-acompanhamento__section">
            <h2 style={{ margin: 0, fontSize: theme.typography.cardTitle.fontSize }}>Detalhe das atividades</h2>
            {activities.length === 0 ? <EmptyState variant="compact" title="Sem atividades" description="Ajuste o período ou os filtros para consultar o detalhe." /> : <>
              <div className="leads-acompanhamento__desktop-list">
                <DataTable columns={activityColumns} rows={activities} rowKey="id" compact sortable />
              </div>
              <div className="leads-acompanhamento__mobile-list">
                {activities.map((activity) => <article className="leads-acompanhamento__activity-card" key={activity.id}>
                  <div className="leads-acompanhamento__activity-meta"><Badge variant="primary" size="sm">{formatActivityType(activity.activity_type)}</Badge><span>{formatActivityDate(activity.created_at)}</span></div>
                  <div className="leads-acompanhamento__activity-lead"><LeadLink activity={activity} onAbrirLead={onAbrirLead} /></div>
                  <div>{formatAgentName(activity.actor_name)}</div>
                  <ActivityDetails activity={activity} />
                </article>)}
              </div>
            </>}
            <div className="leads-acompanhamento__pagination"><span style={{ color: theme.colors.muted }}>Página {page} de {totalPages}</span><Button color="light" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button><Button color="light" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Seguinte</Button></div>
          </Card>
        </>
      )}
    </div>
  );
}
