import {
  queryCountAtividadesHoje,
  queryCountEmpreendimentos,
  queryCountImoveisIncompletos,
  queryCountImoveisNaoPublicitados,
  queryCountLeadsAtivas,
  queryCountLeadsByStatus,
  queryCountUnidades
} from "../repositories";
import { countRows } from "./sharedQueries";
import { hasEmpresaId, resolveEmpresaId } from "../../../utils/empresaScope.js";

export async function fetchCockpitKpis() {
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  const inicioAmanha = new Date(inicioHoje);
  inicioAmanha.setDate(inicioAmanha.getDate() + 1);

  const empresaIdPromise = resolveEmpresaId();

  const [
    leadsAtivasCount,
    leadsSemContactoCount,
    leadsAgendadasCount,
    negociosFechadosCount,
    imoveisIncompletosCount,
    atividadesHojeCount,
    empreendimentosCount,
    unidadesCount,
    imoveisNaoPublicitadosCount
  ] = await Promise.all([
    countRows(queryCountLeadsAtivas()),
    countRows(queryCountLeadsByStatus("novo")),
    countRows(queryCountLeadsByStatus("agendamento")),
    countRows(queryCountLeadsByStatus("convertido")),
    countRows(queryCountImoveisIncompletos()),
    countRows(queryCountAtividadesHoje(inicioHoje.toISOString(), inicioAmanha.toISOString())),
    empresaIdPromise.then((empresaId) => hasEmpresaId(empresaId) ? countRows(queryCountEmpreendimentos(empresaId)) : 0),
    empresaIdPromise.then((empresaId) => hasEmpresaId(empresaId) ? countRows(queryCountUnidades(empresaId)) : 0),
    empresaIdPromise.then((empresaId) => hasEmpresaId(empresaId) ? countRows(queryCountImoveisNaoPublicitados(empresaId)) : 0)
  ]);

  return {
    "kpi-leads-ativas": String(leadsAtivasCount),
    "kpi-leads-sem-contacto": String(leadsSemContactoCount),
    "kpi-leads-agendadas": String(leadsAgendadasCount),
    "kpi-negocios-fechados": String(negociosFechadosCount),
    "kpi-imoveis-incompletos": String(imoveisIncompletosCount),
    "kpi-atividades-hoje": String(atividadesHojeCount),
    "kpi-empreendimentos": String(empreendimentosCount),
    "kpi-fracoes-registadas": String(unidadesCount),
    "kpi-imoveis-nao-publicitados": String(imoveisNaoPublicitadosCount)
  };
}
