import { supabase } from "../../../supabase";
import { applyEmpresaScope } from "../../../utils/empresaScope";

export function fetchCompromissosPorPeriodo(empresaId = null, { dataInicio = null, dataFim = null } = {}) {
  let query = applyEmpresaScope(
    supabase
      .from("compromissos")
      .select("*"),
    empresaId
  );

  if (dataInicio) {
    query = query.gte("data", dataInicio);
  }

  if (dataFim) {
    query = query.lte("data", dataFim);
  }

  return query
    .order("data", { ascending: true })
    .order("hora_inicio", { ascending: true });
}

export function fetchCompromissoById(compromissoId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("compromissos")
      .select("*")
      .eq("id", compromissoId),
    empresaId
  ).single();
}

export function insertCompromisso(payload) {
  return supabase
    .from("compromissos")
    .insert([payload])
    .select();
}

export function insertCompromissos(payloads = []) {
  if (!Array.isArray(payloads) || payloads.length === 0) {
    return Promise.resolve({ data: [], error: null });
  }

  return supabase
    .from("compromissos")
    .insert(payloads)
    .select();
}

export function updateCompromissoById(compromissoId, payload, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("compromissos")
      .update(payload)
      .eq("id", compromissoId),
    empresaId
  );
}

export function updateCompromissoEstado(compromissoId, estado, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("compromissos")
      .update({
        estado,
        updated_at: new Date().toISOString()
      })
      .eq("id", compromissoId),
    empresaId
  );
}
