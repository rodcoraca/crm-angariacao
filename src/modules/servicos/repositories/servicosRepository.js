import { supabase } from "../../../supabase";
import { applyEmpresaScope } from "../../../utils/empresaScope";

export function fetchServicosEmpresa(empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("servicos")
      .select("*")
      .order("nome", { ascending: true }),
    empresaId
  );
}

export function fetchServicoById(servicoId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("servicos")
      .select("*")
      .eq("id", servicoId),
    empresaId
  ).single();
}

export function insertServico(payload) {
  return supabase
    .from("servicos")
    .insert([payload])
    .select();
}

export function updateServicoById(servicoId, payload, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("servicos")
      .update(payload)
      .eq("id", servicoId),
    empresaId
  );
}

export function updateServicoAtivo(servicoId, ativo, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("servicos")
      .update({
        ativo,
        updated_at: new Date().toISOString()
      })
      .eq("id", servicoId),
    empresaId
  );
}
