import { getLeadStatusLabel } from "../statusCatalog";

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

const REMINDER_DATE_FORMATTER = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit"
});

function asObject(value) {
  return value && typeof value === "object" ? value : {};
}

function formatReminderDate(date, time) {
  if (!date) return null;
  const formattedDate = REMINDER_DATE_FORMATTER.format(new Date(`${date}T00:00:00`));
  return `${formattedDate}${time ? ` às ${time.slice(0, 5)}` : ""}`;
}

function formatProvider(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "imovirtual") return "Imovirtual";
  if (normalized === "olx") return "OLX";
  if (normalized === "idealista") return "Idealista";
  return value || null;
}

export function formatAgentName(value) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized === "Sistema" || normalized === "Utilizador não identificado") return normalized || "Utilizador não identificado";
  return normalized.split(/\s+/).slice(0, 2).join(" ");
}

export function formatActivityDate(value) {
  if (!value) return "Data indisponível";
  return DATE_FORMATTER.format(new Date(value));
}

export function formatActivityType(value) {
  return value === "Operação" ? "Lead — Dados alterados" : value;
}

export function getActivityDetailLines(activity) {
  const details = asObject(activity?.details);
  const before = asObject(details.before);
  const after = asObject(details.after);
  const action = activity?.action || "";
  const lines = [];

  if (activity?.activity_type === "Alteração de status" || (action === "editar_lead" && details.statusChanged)) {
    const previous = activity?.previous_status || before.status;
    const next = activity?.new_status || after.status;
    if (previous || next) lines.push({ label: "Estado", value: `${getLeadStatusLabel(previous)} → ${getLeadStatusLabel(next)}` });
  }

  if (activity?.activity_type === "Alteração de tipo" || action === "alterar_tipo_lead") {
    const previous = before.tipo;
    const next = after.tipo;
    if (previous || next) lines.push({ label: "Tipo", value: `${previous || "Sem tipo"} → ${next || "Sem tipo"}` });
  }

  if (activity?.activity_type === "Importação" || action === "importar_lead_radar" || details.importProviderLeadId) {
    const provider = formatProvider(details.importProvider || details.provider);
    if (provider) lines.push({ label: "Provider", value: provider });
  }

  if (activity?.activity_type === "Lembrete criado" || activity?.activity_type === "Lembrete alterado" || action === "criar_lembrete" || action === "alterar_lembrete") {
    const reminder = formatReminderDate(after.data_lembrete || before.data_lembrete, after.hora_lembrete || before.hora_lembrete);
    if (reminder) lines.push({ label: "Lembrete", value: reminder });
  }

  if (activity?.activity_type === "Lembrete concluído" || action === "concluir_lembrete") {
    lines.push({ label: "Estado", value: "Concluído" });
  }

  if (activity?.activity_type === "Atribuição" || action === "transferir_responsavel_lead") {
    lines.push({ label: "Responsável", value: "Responsável atualizado" });
  }

  if (activity?.activity_type === "Criação" || action === "criar_lead") {
    lines.push({ label: "Lead", value: "Criada" });
  }

  return lines.length ? lines : [{ label: "Lead", value: "Dados alterados" }];
}

export function formatActivitySummary(activity) {
  return getActivityDetailLines(activity).map((line) => `${line.label}: ${line.value}`).join(" · ");
}

export function getDistinctLeadStatusCounts(activities = []) {
  const leads = new Map();

  activities.forEach((activity) => {
    if (!activity?.lead_id || !activity?.current_status) return;
    leads.set(activity.lead_id, activity.current_status);
  });

  const statusCounts = Object.fromEntries(leads.values().map((status) => [status, 0]));
  leads.forEach((status) => {
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const total = leads.size;
  const newCount = statusCounts.novo || 0;
  return {
    total,
    newCount,
    accompanied: Math.max(0, total - newCount),
    statusCounts
  };
}
