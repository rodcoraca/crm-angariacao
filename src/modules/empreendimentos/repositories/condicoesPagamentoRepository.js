import { supabase } from "../../../supabase";
import { applyEmpresaScope } from "../../../utils/empresaScope.js";

const EMPREENDIMENTO_CONDICOES_TABLE = "empreendimento_condicoes_pagamento";

export function fetchCondicoesPagamentoByEmpreendimento(empreendimentoId, empresaId = null) {
  if (!empreendimentoId) {
    return Promise.resolve({ data: [], error: null });
  }

  return applyEmpresaScope(
    supabase
      .from(EMPREENDIMENTO_CONDICOES_TABLE)
      .select("*")
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
  return applyEmpresaScope(
    supabase
      .from(EMPREENDIMENTO_CONDICOES_TABLE)
      .update(payload)
      .eq("id", condicaoId)
      .select(),
    empresaId
  );
}

export function deleteCondicaoPagamento(condicaoId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from(EMPREENDIMENTO_CONDICOES_TABLE)
      .delete()
      .eq("id", condicaoId)
      .select(),
    empresaId
  );
}
