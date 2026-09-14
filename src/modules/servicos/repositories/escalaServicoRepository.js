import { supabase } from "../../../supabase";
import { applyEmpresaScope } from "../../../utils/empresaScope";

export function fetchEscalaServicoPorSemana(empresaId, semanaInicio, semanaFim) {
  return applyEmpresaScope(
    supabase
      .from("escalas_servico")
      .select("id, empresa_id, semana_inicio, semana_fim, tipo, estado, published_at, published_by, created_by, created_at, updated_at, escalas_servico_linhas(*)")
      .eq("semana_inicio", semanaInicio)
      .eq("semana_fim", semanaFim)
      .eq("tipo", "servico")
      .order("created_at", { ascending: false }),
    empresaId
  );
}

export function fetchEscalasServicoPublicadas(empresaId) {
  return applyEmpresaScope(
    supabase
      .from("escalas_servico")
      .select("id, empresa_id, semana_inicio, semana_fim, tipo, estado, published_at, published_by, escalas_servico_linhas(*)")
      .eq("tipo", "servico")
      .eq("estado", "publicada")
      .order("semana_inicio", { ascending: false }),
    empresaId
  );
}

export function fetchEscalaServicoPublicadaById(empresaId, escalaId) {
  return applyEmpresaScope(
    supabase
      .from("escalas_servico")
      .select("id, empresa_id, semana_inicio, semana_fim, tipo, estado, published_at, published_by, escalas_servico_linhas(*)")
      .eq("id", escalaId)
      .eq("tipo", "servico")
      .eq("estado", "publicada")
      .maybeSingle(),
    empresaId
  );
}

export function substituirEscalaServico(semanaInicio, semanaFim, linhas) {
  return supabase.rpc("substituir_escala_servico", {
    p_semana_inicio: semanaInicio,
    p_semana_fim: semanaFim,
    p_linhas: linhas,
  });
}

export function publicarEscalaServico(escalaId) {
  return supabase.rpc("publicar_escala_servico", { p_escala_id: escalaId });
}
