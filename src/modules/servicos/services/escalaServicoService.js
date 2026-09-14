import { resolveEmpresaId, hasEmpresaId, warnMissingEmpresaId, buildMissingEmpresaError } from "../../../utils/empresaScope.js";
import {
  fetchEscalaServicoPorSemana,
  fetchEscalasServicoPublicadas,
  fetchEscalaServicoPublicadaById,
  publicarEscalaServico as publicarEscalaServicoRepository,
  substituirEscalaServico as substituirEscalaServicoRepository,
} from "../repositories/escalaServicoRepository";

function obterSemanaFim(semanaInicio) {
  const fim = new Date(`${semanaInicio}T00:00:00`);
  fim.setDate(fim.getDate() + 4);
  return fim.toISOString().slice(0, 10);
}

export async function listarEscalaServicoPorSemana({ user, semanaInicio }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: null };
  }

  try {
    const semanaFim = obterSemanaFim(semanaInicio);
    const { data, error } = await fetchEscalaServicoPorSemana(empresaId, semanaInicio, semanaFim);
    if (error) return { data: null, error };
    const escalas = data || [];
    return { data: escalas.find((item) => item.estado === "rascunho") || escalas[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function listarEscalasServicoPublicadas({ user }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) return { data: [], error: null };

  try {
    const { data, error } = await fetchEscalasServicoPublicadas(empresaId);
    return { data: data || [], error: error || null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function obterEscalaServicoPublicada({ user, escalaId }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) return { data: null, error: null };

  try {
    const { data, error } = await fetchEscalaServicoPublicadaById(empresaId, escalaId);
    return { data: data || null, error: error || null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function substituirEscalaServico({ user, semanaInicio, linhas = [] }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: buildMissingEmpresaError() };
  }

  if (!semanaInicio || !Array.isArray(linhas) || linhas.length === 0) {
    return { data: null, error: new Error("Dados da escala de serviço inválidos.") };
  }

  try {
    const semanaFim = obterSemanaFim(semanaInicio);
    const { data, error } = await substituirEscalaServicoRepository(semanaInicio, semanaFim, linhas);
    return { data: data || null, error: error || null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function publicarEscalaServico({ user, escalaId }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) return { data: null, error: buildMissingEmpresaError() };
  if (!escalaId) return { data: null, error: new Error("Escala inválida.") };

  try {
    const { data, error } = await publicarEscalaServicoRepository(escalaId);
    return { data: data || null, error: error || null };
  } catch (error) {
    return { data: null, error };
  }
}
