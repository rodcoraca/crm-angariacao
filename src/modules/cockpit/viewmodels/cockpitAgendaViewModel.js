import { mapAgendaLead, mapLembreteLead } from "../utils/mappers";

export function mapCockpitAgendaData(raw) {
  const { visitasHoje = [], lembretesHoje = [] } = raw || {};

  return [
    ...visitasHoje.map((lead) => ({ ...mapAgendaLead(lead, { tipo: "hoje", prioridade: "Alta", icone: "H" }), tipoAgenda: "compromisso", leadId: lead.id })),
    ...lembretesHoje.map(mapLembreteLead)
  ];
}
