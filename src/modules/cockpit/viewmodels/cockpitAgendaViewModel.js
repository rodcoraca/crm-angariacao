import { mapAgendaLead } from "../utils/mappers";

export function mapCockpitAgendaData(raw) {
  const {
    visitasHoje = [],
    visitasFuturas = [],
    agendadasSemData = []
  } = raw || {};

  return [
    ...visitasHoje.map((lead) => mapAgendaLead(lead, { tipo: "hoje", prioridade: "Alta", icone: "H" })),
    ...visitasFuturas.map((lead) => mapAgendaLead(lead, { tipo: "futura", prioridade: "Media", icone: "F" })),
    ...agendadasSemData.map((lead) => mapAgendaLead(lead, { tipo: "sem-data", prioridade: "Baixa", icone: "S" }))
  ];
}
