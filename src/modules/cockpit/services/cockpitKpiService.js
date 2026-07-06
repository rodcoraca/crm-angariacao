import {
  queryCountAtividadesHoje,
  queryCountImoveisIncompletos,
  queryCountLeadsAtivas,
  queryCountLeadsByStatus
} from "../repositories";
import { countRows } from "./sharedQueries";

export async function fetchCockpitKpis() {
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  const inicioAmanha = new Date(inicioHoje);
  inicioAmanha.setDate(inicioAmanha.getDate() + 1);

  const [
    leadsAtivasCount,
    leadsSemContactoCount,
    leadsAgendadasCount,
    negociosFechadosCount,
    imoveisIncompletosCount,
    atividadesHojeCount
  ] = await Promise.all([
    countRows(queryCountLeadsAtivas()),
    countRows(queryCountLeadsByStatus("novo")),
    countRows(queryCountLeadsByStatus("agendado")),
    countRows(queryCountLeadsByStatus("fechado")),
    countRows(queryCountImoveisIncompletos()),
    countRows(queryCountAtividadesHoje(inicioHoje.toISOString(), inicioAmanha.toISOString()))
  ]);

  return {
    "kpi-leads-ativas": String(leadsAtivasCount),
    "kpi-leads-sem-contacto": String(leadsSemContactoCount),
    "kpi-leads-agendadas": String(leadsAgendadasCount),
    "kpi-negocios-fechados": String(negociosFechadosCount),
    "kpi-imoveis-incompletos": String(imoveisIncompletosCount),
    "kpi-atividades-hoje": String(atividadesHojeCount)
  };
}
