import { formatarNomeApresentacao } from "../../../utils/nomes";
import { resolveEmpresaIdFromContext } from "../../../utils/empresaScope";
import { fetchAgentesAtivos, fetchLeadAgenteIds } from "../repositories/leadsRepository";
import { pertenceAoMesmoContrato, resolverContratoIdentidade } from "../utils/identityContract";

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
    nome: agente.nome || agente.email || agente.id,
    email: agente.email || ""
  }));
}

function buildAgentesFallback(ids = [], user) {
  const contrato = resolverContratoIdentidade(user);

  return ids.map((id) => ({
    id,
    nome: contrato.idsRelacionados.includes(id) ? obterNomeUtilizadorAtual(user) : "Agente validado",
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
  const agente = (agentes || []).find((item) => item.id === agenteId);

  if (agente) return formatarNomeApresentacao(agente.nome);
  if (pertenceAoMesmoContrato(agenteId, user)) return formatarNomeApresentacao(obterNomeUtilizadorAtual(user));

  return agenteId || "Sem agente";
}
