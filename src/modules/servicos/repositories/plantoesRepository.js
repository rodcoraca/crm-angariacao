import { supabase } from "../../../supabase";
import { applyEmpresaScope } from "../../../utils/empresaScope";

export function fetchPlantoesPorPeriodo(empresaId = null, { dataInicio = null, dataFim = null } = {}) {
  let query = applyEmpresaScope(
    supabase
      .from("plantoes")
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

export function fetchPlantaoById(plantaoId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("plantoes")
      .select("*")
      .eq("id", plantaoId),
    empresaId
  ).single();
}

export function insertPlantao(payload) {
  return supabase
    .from("plantoes")
    .insert([payload])
    .select();
}

export function updatePlantaoById(plantaoId, payload, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("plantoes")
      .update(payload)
      .eq("id", plantaoId),
    empresaId
  );
}

export function updatePlantaoEstado(plantaoId, estado, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("plantoes")
      .update({
        estado,
        updated_at: new Date().toISOString()
      })
      .eq("id", plantaoId),
    empresaId
  );
}

export function updatePlantaoUsuario(plantaoId, usuarioId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from("plantoes")
      .update({
        usuario_id: usuarioId,
        updated_at: new Date().toISOString()
      })
      .eq("id", plantaoId),
    empresaId
  );
}

export function fetchEscalaPlantaoPorPeriodo(empresaId, periodoInicio, periodoFim) {
  return applyEmpresaScope(
    supabase
      .from("plantoes")
      .select("*")
      .eq("periodo_inicio", periodoInicio)
      .eq("periodo_fim", periodoFim)
      .not("escala_id", "is", null)
      .order("data", { ascending: true }),
    empresaId
  );
}

export function fetchEscalasPlantaoPublicadas(empresaId) {
  return applyEmpresaScope(
    supabase
      .from("plantoes")
      .select("*")
      .eq("escala_estado", "publicada")
      .not("escala_id", "is", null)
      .order("periodo_inicio", { ascending: false })
      .order("data", { ascending: true }),
    empresaId
  );
}

export function fetchEscalaPlantaoPublicadaById(empresaId, escalaId) {
  return applyEmpresaScope(
    supabase
      .from("plantoes")
      .select("*")
      .eq("escala_id", escalaId)
      .eq("escala_estado", "publicada")
      .order("data", { ascending: true }),
    empresaId
  );
}

export function substituirEscalaPlantao(periodoInicio, periodoFim, linhas) {
  return supabase.rpc("substituir_escala_plantao", {
    p_periodo_inicio: periodoInicio,
    p_periodo_fim: periodoFim,
    p_linhas: linhas,
  });
}

export function publicarEscalaPlantao(escalaId) {
  return supabase.rpc("publicar_escala_plantao", { p_escala_id: escalaId });
}
