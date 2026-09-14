import { supabase } from "../../../supabase";
import { applyEmpresaScope } from "../../../utils/empresaScope";

export function fetchLeadLembretesAtivos(empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("lead_lembretes")
      .select("*")
      .eq("estado", "ativo"),
    empresaId
  )
    .order("data_lembrete", { ascending: true })
    .order("hora_lembrete", { ascending: true, nullsFirst: false });
}

export function fetchLeadLembreteById(lembreteId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("lead_lembretes")
      .select("*")
      .eq("id", lembreteId),
    empresaId
  )
    .maybeSingle();
}

export function fetchLeadLembreteAtivo(leadId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("lead_lembretes")
      .select("*")
      .eq("lead_id", leadId)
      .eq("estado", "ativo"),
    empresaId
  )
    .maybeSingle();
}

export function fetchLeadLembretesConcluidos(leadId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("lead_lembretes")
      .select("*")
      .eq("lead_id", leadId)
      .eq("estado", "concluido")
      .order("concluido_at", { ascending: false })
      .order("data_lembrete", { ascending: false })
      .order("hora_lembrete", { ascending: false, nullsFirst: false }),
    empresaId
  );
}

export function insertLeadLembrete(payload, empresaId = null) {
  const query = supabase
    .from("lead_lembretes")
    .insert([payload])
    .select();

  return empresaId ? applyEmpresaScope(query, empresaId) : query;
}

export function updateLeadLembreteById(id, payload, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("lead_lembretes")
      .update(payload)
      .eq("id", id),
    empresaId
  );
}
