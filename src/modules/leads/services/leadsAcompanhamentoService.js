import { resolveEmpresaId } from "../../../utils/empresaScope";
import { fetchLeadsAcompanhamento, fetchLeadsAcompanhamentoGlobalKpis } from "../repositories/leadsAcompanhamentoRepository";

function localDateToIso(date, endOfDay = false) {
  const value = new Date(`${date}T00:00:00.000Z`);
  if (endOfDay) value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString();
}

export async function carregarAcompanhamentoLeads({ user, filtros, page = 1, pageSize = 25 }) {
  const empresaId = await resolveEmpresaId(user);
  if (!empresaId) return { data: null, error: new Error("Operação sem empresa_id.") };

  const query = {
    empresaId,
    dateFrom: localDateToIso(filtros.dateFrom),
    dateTo: localDateToIso(filtros.dateTo, true),
    origin: filtros.origin,
    status: filtros.status
  };
  const [timelineResult, kpisResult] = await Promise.all([
    fetchLeadsAcompanhamento({ ...query, userId: null, agentId: filtros.userId, activity: filtros.activity, page, pageSize }),
    fetchLeadsAcompanhamentoGlobalKpis({ ...query, agentId: filtros.userId })
  ]);
  const { data, error } = timelineResult;
  const kpisError = kpisResult.error || (kpisResult.data?.error === "forbidden" ? new Error("Não possui permissões para consultar o acompanhamento de Leads.") : null);

  if (error || kpisError) return { data: null, error: error || kpisError };
  if (data?.error === "forbidden") return { data: null, error: new Error("Não possui permissões para consultar o acompanhamento de Leads.") };
  return { data: { ...(data || {}), global_kpis: kpisResult.data?.kpis || {}, global_agents: kpisResult.data?.agents || [], global_importers: kpisResult.data?.importers || [] }, error: null };
}