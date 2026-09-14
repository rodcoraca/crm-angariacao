import { supabase } from "../../../supabase";
import { applyEmpresaScope } from "../../../utils/empresaScope";

export function fetchParticipantesServico(servicoId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("servico_participantes")
      .select("*")
      .eq("servico_id", servicoId),
    empresaId
  )
    .order("created_at", { ascending: false });
}

export function fetchParticipanteServicoById(participanteId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("servico_participantes")
      .select("*")
      .eq("id", participanteId),
    empresaId
  ).single();
}

export function insertParticipanteServico(payload) {
  return supabase
    .from("servico_participantes")
    .insert([payload])
    .select();
}

export function updateParticipanteServicoById(participanteId, payload, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("servico_participantes")
      .update(payload)
      .eq("id", participanteId),
    empresaId
  );
}

export function deleteParticipanteServicoById(participanteId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("servico_participantes")
      .delete()
      .eq("id", participanteId),
    empresaId
  );
}
