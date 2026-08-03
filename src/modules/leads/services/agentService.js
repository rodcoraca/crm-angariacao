import { formatarNomeApresentacao } from "../../../utils/nomes";
import { resolveEmpresaIdFromContext } from "../../../utils/empresaScope.js";
import { fetchAgentesAtivos, fetchLeadAgenteIds } from "../repositories/leadsRepository";
import { pertenceAoMesmoContrato, resolverContratoIdentidade } from "../utils/identityContract";

function isUuid(valor) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(valor || ""));
}

export function obterNomeUtilizadorAtual(user) {
  return user?.user_metadata?.nome ||
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "Agente atual";
}

function mapAgentes(data = []) {
  return data.map((agente) => ({
    id: agente.id,
    nome: agente.nome || agente.email || "Utilizador não encontrado",
    email: agente.email || ""
  }));
}

function buildAgentesFallback(ids = [], user) {
  const contrato = resolverContratoIdentidade(user);

  return ids.map((id) => ({
    id,
    nome: contrato.idsRelacionados.includes(id) ? obterNomeUtilizadorAtual(user) : "Utilizador não encontrado",
    email: contrato.idsRelacionados.includes(id) ? user?.email || "" : id
  }));
}

export async function carregarAgentesParaLeads(leadsCarregadas, user) {
  const { data, error } = await fetchAgentesAtivos();

  if (!error && data?.length) {
    return mapAgentes(data);
  }

  const ids = [...new Set((leadsCarregadas || []).map((lead) => lead.agente_id).filter(Boolean))];
  const contrato = resolverContratoIdentidade(user);
  if (contrato.responsavelId && !ids.includes(contrato.responsavelId)) ids.push(contrato.responsavelId);

  return buildAgentesFallback(ids, user);
}

export async function carregarAgentesParaFicha(agenteAtualId, user) {
  const { data, error } = await fetchAgentesAtivos();

  if (!error && data?.length) {
    return mapAgentes(data);
  }

  const empresaId = resolveEmpresaIdFromContext(user);
  const { data: leadsData } = await fetchLeadAgenteIds(empresaId);
  const ids = [...new Set((leadsData || []).map((lead) => lead.agente_id).filter(Boolean))];
  const contrato = resolverContratoIdentidade(user);

  if (agenteAtualId && !ids.includes(agenteAtualId)) ids.push(agenteAtualId);
  if (contrato.responsavelId && !ids.includes(contrato.responsavelId)) ids.push(contrato.responsavelId);

  return buildAgentesFallback(ids, user);
}

export function resolverNomeAgente(agentes, agenteId, user) {
  if (!agenteId) return "Sem agente atribuído";

  const agente = (agentes || []).find(
    (item) => String(item.id) === String(agenteId)
  );

  if (agente && !isUuid(agente.nome)) return formatarNomeApresentacao(agente.nome);

  if (pertenceAoMesmoContrato(agenteId, user)) {
    const nomeAtual = obterNomeUtilizadorAtual(user);
    return isUuid(nomeAtual) ? "Utilizador não encontrado" : formatarNomeApresentacao(nomeAtual);
  }

  return "Utilizador não encontrado";
}
