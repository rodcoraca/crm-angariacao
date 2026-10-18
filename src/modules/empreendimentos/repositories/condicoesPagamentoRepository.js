import { supabase } from "../../../supabase";

const EMPREENDIMENTO_CONDICOES_TABLE = "empreendimento_condicoes_pagamento";
const CONDICAO_WITH_EMPRESA = "*, empreendimentos!inner(empresa_id)";

function applyCondicaoEmpresaScope(query, empresaId) {
  if (!empresaId) return query;
  return query.eq("empreendimentos.empresa_id", empresaId);
}

export function fetchCondicoesPagamentoByEmpreendimento(empreendimentoId, empresaId = null) {
  if (!empreendimentoId) {
    return Promise.resolve({ data: [], error: null });
  }

  return applyCondicaoEmpresaScope(
    supabase
      .from(EMPREENDIMENTO_CONDICOES_TABLE)
      .select(CONDICAO_WITH_EMPRESA)
      .eq("empreendimento_id", empreendimentoId),
    empresaId
  ).order("ordem", { ascending: true });
}

export function insertCondicaoPagamento(payload) {
  return supabase
    .from(EMPREENDIMENTO_CONDICOES_TABLE)
    .insert([payload])
    .select();
}

export function updateCondicaoPagamento(condicaoId, payload, empresaId = null) {
  return applyCondicaoEmpresaScope(
    supabase
      .from(EMPREENDIMENTO_CONDICOES_TABLE)
      .update(payload)
      .eq("id", condicaoId)
      .select(CONDICAO_WITH_EMPRESA),
    empresaId
  );
}

export function deleteCondicaoPagamento(condicaoId, empresaId = null) {
  return applyCondicaoEmpresaScope(
    supabase
      .from(EMPREENDIMENTO_CONDICOES_TABLE)
      .delete()
      .eq("id", condicaoId)
      .select(CONDICAO_WITH_EMPRESA),
    empresaId
  );
}
