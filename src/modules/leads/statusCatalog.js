export const LEAD_STATUSES = [
  { value: "novo", label: "Novo" },
  { value: "em_contacto", label: "Em contacto" },
  { value: "em_acompanhamento", label: "Em acompanhamento" },
  { value: "agendamento", label: "Agendamento" },
  { value: "proposta", label: "Proposta" },
  { value: "convertido", label: "Convertido" },
  { value: "nao_evoluiu", label: "Não evoluiu" },
  { value: "migrado", label: "Migrado" }
];

export const LEAD_STATUS_VALUES = LEAD_STATUSES.map((status) => status.value);

export function getLeadStatusLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return LEAD_STATUSES.find((status) => status.value === normalized)?.label || value || "Sem estado";
}

export function getLeadStatusVariant(value) {
  if (value === "convertido") return "success";
  if (value === "nao_evoluiu") return "danger";
  if (value === "migrado") return "neutral";
  if (value === "proposta" || value === "agendamento") return "warning";
  return "primary";
}