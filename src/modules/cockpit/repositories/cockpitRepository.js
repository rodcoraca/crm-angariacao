import { supabase } from "../../../supabase";

export function queryCountLeadsAtivas() {
  return supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .or("status.neq.fechado,status.is.null");
}

export function queryCountLeadsByStatus(status) {
  return supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("status", status);
}

export function queryCountImoveisIncompletos() {
  return supabase
    .from("estoque_nao_publicitado")
    .select("id", { count: "exact", head: true })
    .or([
      "cmi.is.false",
      "cmi.is.null",
      "caderneta_predial.is.false",
      "caderneta_predial.is.null",
      "plantas.is.false",
      "plantas.is.null",
      "certificado_energetico.is.false",
      "certificado_energetico.is.null",
      "cartao_cidadao.is.false",
      "cartao_cidadao.is.null"
    ].join(","));
}

export function queryCountAtividadesHoje(inicioIso, fimIso) {
  return supabase
    .from("logs_navegacao")
    .select("id", { count: "exact", head: true })
    .gte("created_at", inicioIso)
    .lt("created_at", fimIso);
}

export function queryLeadsSemContacto(camposBase, limite) {
  return supabase
    .from("leads")
    .select(camposBase)
    .eq("status", "novo")
    .order("created_at", { ascending: true })
    .limit(limite);
}

export function queryFollowupPendente(camposFollowup, dataLimiteIso, limite) {
  return supabase
    .from("leads")
    .select(camposFollowup)
    .eq("status", "contactado")
    .lt("updated_at", dataLimiteIso)
    .order("updated_at", { ascending: true })
    .limit(limite);
}

export function queryLeadsSemResponsavel(camposBase, limite) {
  return supabase
    .from("leads")
    .select(camposBase)
    .is("agente_id", null)
    .order("created_at", { ascending: true })
    .limit(limite);
}

export function queryLeadsConfirmacaoVisitasComData(camposComDataVisita) {
  return supabase
    .from("leads")
    .select(camposComDataVisita)
    .eq("status", "agendado")
    .order("data_visita", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(50);
}

export function queryLeadsConfirmacaoVisitasSemData(camposSemDataVisita) {
  return supabase
    .from("leads")
    .select(camposSemDataVisita)
    .eq("status", "agendado")
    .order("created_at", { ascending: true })
    .limit(50);
}

export function queryAgendaVisitasHoje(camposAgenda, inicioHojeIso, inicioAmanhaIso, limite) {
  return supabase
    .from("leads")
    .select(camposAgenda)
    .eq("status", "agendado")
    .gte("data_visita", inicioHojeIso)
    .lt("data_visita", inicioAmanhaIso)
    .order("data_visita", { ascending: true })
    .limit(limite);
}

export function queryAgendaVisitasFuturas(camposAgenda, inicioAmanhaIso, limite) {
  return supabase
    .from("leads")
    .select(camposAgenda)
    .eq("status", "agendado")
    .gte("data_visita", inicioAmanhaIso)
    .order("data_visita", { ascending: true })
    .limit(limite);
}

export function queryAgendaAgendadasSemData(camposAgenda, limite) {
  return supabase
    .from("leads")
    .select(camposAgenda)
    .eq("status", "agendado")
    .is("data_visita", null)
    .order("created_at", { ascending: true })
    .limit(limite);
}

export function queryRiscoImoveis() {
  return supabase
    .from("estoque_nao_publicitado")
    .select([
      "id",
      "proprietario",
      "telefone",
      "tipologia",
      "zona",
      "valor_pretendido",
      "morada",
      "concelho",
      "distrito",
      "cmi",
      "caderneta_predial",
      "plantas",
      "certificado_energetico",
      "cartao_cidadao"
    ].join(","));
}

export function queryRiscoFicheiros() {
  return supabase
    .from("imovel_ficheiros")
    .select("id,imovel_id");
}
