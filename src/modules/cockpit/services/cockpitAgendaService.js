import {
  queryAgendaAgendadasSemData,
  queryAgendaVisitasFuturas,
  queryAgendaVisitasHoje
} from "../repositories";
import { fetchRows } from "./sharedQueries";

export async function fetchCockpitAgenda() {
  const limite = 5;
  const camposAgenda = "id,nome,telefone,status,data_visita,hora_visita,local_visita,status_visita,created_at";
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const inicioAmanha = new Date(inicioHoje);
  inicioAmanha.setDate(inicioAmanha.getDate() + 1);

  const [visitasHoje, visitasFuturas, agendadasSemData] = await Promise.all([
    fetchRows(queryAgendaVisitasHoje(camposAgenda, inicioHoje.toISOString(), inicioAmanha.toISOString(), limite)),
    fetchRows(queryAgendaVisitasFuturas(camposAgenda, inicioAmanha.toISOString(), limite)),
    fetchRows(queryAgendaAgendadasSemData(camposAgenda, limite))
  ]);

  return {
    visitasHoje,
    visitasFuturas,
    agendadasSemData
  };
}
