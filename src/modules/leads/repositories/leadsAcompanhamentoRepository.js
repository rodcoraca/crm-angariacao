import { supabase } from "../../../supabase";

export function fetchLeadsAcompanhamento({
  empresaId,
  dateFrom,
  dateTo,
  userId = null,
  origin = null,
  status = null,
  activity = null,
  agentId = null,
  page = 1,
  pageSize = 25
}) {
  return supabase.rpc("leads_acompanhamento", {
    p_empresa_id: empresaId,
    p_date_from: dateFrom,
    p_date_to: dateTo,
    p_user_id: userId || null,
    p_origin: origin || null,
    p_status: status || null,
    p_activity: activity || null,
    p_page: page,
    p_page_size: pageSize,
    p_agente_id: agentId || null
  });
}

export function fetchLeadsAcompanhamentoGlobalKpis({
  empresaId,
  dateFrom,
  dateTo,
  origin = null,
  status = null,
  agentId = null
}) {
  return supabase.rpc("leads_acompanhamento_global_kpis", {
    p_empresa_id: empresaId,
    p_date_from: dateFrom,
    p_date_to: dateTo,
    p_origin: origin || null,
    p_status: status || null,
    p_agente_id: agentId || null
  });
}