import { normalizarTelefone, validarTelefone } from "../../../telefone";
import { auditMutation } from "../../audit/services";
import {
  fetchDashboardLeads,
  fetchLeadById,
  fetchLeadByTelefone,
  fetchLeadByTelefoneExcludingId,
  fetchLeadsByTipo,
  insertLead,
  updateLeadById
} from "../repositories/leadsRepository";
import { resolverContratoIdentidade } from "../utils/identityContract";
import { canManageLead, canTransferLead } from "./leadPermissionService";
import {
  buildMissingEmpresaError,
  hasEmpresaId,
  resolveEmpresaId,
  warnMissingEmpresaId
} from "../../../utils/empresaScope.js";

async function executarMutacaoComErro(mutationHandler) {
  const result = await mutationHandler();
  if (result?.error) throw result.error;
  return result;
}

function criarErroForbidden() {
  return new Error("Não possui permissões para alterar esta Lead.");
}

async function carregarLeadAutorizada(leadId, empresaId, user, autorizador) {
  const { data: lead, error } = await fetchLeadById(leadId, empresaId);
  if (error) throw error;

  if (!lead || !autorizador(user, lead)) {
    throw criarErroForbidden();
  }

  return lead;
}

function criarContextoAuditoriaLeads({
  user,
  leadId,
  action,
  details = {},
  eventType
}) {
  const contrato = resolverContratoIdentidade(user);

  return {
    userId: contrato.responsavelId,
    empresaId: user?.empresa_id || user?.user_metadata?.empresa_id || null,
    modulo: "leads",
    entidade: "leads",
    entidadeId: leadId || null,
    metadata: {
      action,
      eventType,
      responsavelContrato: {
        responsavelId: contrato.responsavelId,
        usuarioId: contrato.usuarioId,
        authUserId: contrato.authUserId
      },
      ...details
    }
  };
}

export async function carregarLeadsPorTipo(tipo) {
  const empresaId = await resolveEmpresaId();
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  const { data, error } = await fetchLeadsByTipo(tipo, empresaId);

  if (error) return { data: [], error };
  return { data: data || [], error: null };
}

export async function carregarLeadsDashboard() {
  const empresaId = await resolveEmpresaId();
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  const { data, error } = await fetchDashboardLeads(empresaId);

  if (error) return { data: [], error };
  return { data: data || [], error: null };
}

export async function alterarTipoLead(leadId, novoTipo, user) {
  try {
    const empresaId = await resolveEmpresaId(user);
    if (!hasEmpresaId(empresaId)) {
      warnMissingEmpresaId();
      return { error: buildMissingEmpresaError() };
    }

    const leadAtual = await carregarLeadAutorizada(leadId, empresaId, user, canManageLead);

    const contexto = criarContextoAuditoriaLeads({
      user,
      leadId,
      eventType: "update",
      action: "alterar_estado_lead",
      details: {
        mutation: "state_change",
        before: {
          tipo: leadAtual?.tipo || null
        },
        after: {
          tipo: novoTipo
        }
      }
    });

    const result = await auditMutation("update", () => executarMutacaoComErro(() => updateLeadById(leadId, {
      tipo: novoTipo,
      updated_at: new Date().toISOString()
    }, empresaId)), contexto);

    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}

export async function salvarObservacaoLead(leadId, observacoes, user) {
  try {
    const empresaId = await resolveEmpresaId(user);
    if (!hasEmpresaId(empresaId)) {
      warnMissingEmpresaId();
      return { error: buildMissingEmpresaError() };
    }

    await carregarLeadAutorizada(leadId, empresaId, user, canManageLead);

    const contexto = criarContextoAuditoriaLeads({
      user,
      leadId,
      eventType: "update",
      action: "editar_lead",
      details: {
        mutation: "notes_update"
      }
    });

    const result = await auditMutation("update", () => executarMutacaoComErro(() => updateLeadById(leadId, {
      observacoes,
      updated_at: new Date().toISOString()
    }, empresaId)), contexto);

    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}

export async function carregarFichaLead(leadId) {
  const empresaId = await resolveEmpresaId();
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { lead: null, form: null, error: null };
  }

  const { data, error } = await fetchLeadById(leadId, empresaId);
  if (error) return { lead: null, form: null, error };

  return {
    lead: data,
    form: {
      nome: data.nome || "",
      telefone: data.telefone || "",
      tipo: data.tipo || "morno",
      origem: data.origem || "",
      observacoes: data.observacoes || "",
      status: data.status || "novo",
      agente_id: data.agente_id || ""
    },
    error: null
  };
}

export function validarEntradaTelefone(valor) {
  const telefoneNormalizado = normalizarTelefone(valor);

  if (!telefoneNormalizado) {
    return { telefone: telefoneNormalizado, erro: "" };
  }

  return {
    telefone: telefoneNormalizado,
    erro: validarTelefone(telefoneNormalizado)
      ? ""
      : "Informe o telefone com 12 dígitos (indicativo + 9 dígitos)."
  };
}

export async function verificarLeadExistente(telefone) {
  if (!telefone || !validarTelefone(telefone)) return { lead: null, error: null };

  const empresaId = await resolveEmpresaId();
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { lead: null, error: null };
  }

  const { data, error } = await fetchLeadByTelefone(telefone, empresaId);

  if (error) return { lead: null, error };

  return { lead: data || null, error: null };
}

export async function salvarLeadFluxo({ nome, telefone, tipo, origem, observacao, user }) {
  const telefoneNormalizado = normalizarTelefone(telefone);
  const hasPhone = Boolean(telefoneNormalizado);

  if (hasPhone && !validarTelefone(telefoneNormalizado)) {
    return {
      error: { message: "Informe o telefone com 12 dígitos (indicativo + 9 dígitos).\n", invalidPhone: true }
    };
  }

  if (hasPhone) {
    const leadExistenteResult = await verificarLeadExistente(telefoneNormalizado);
    if (leadExistenteResult.error) return { error: leadExistenteResult.error };

    if (leadExistenteResult.lead) {
      return { duplicateLead: leadExistenteResult.lead, error: null };
    }
  }

  const contrato = resolverContratoIdentidade(user);
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  const payload = {
    nome,
    telefone: hasPhone ? telefoneNormalizado : null,
    tipo,
    origem,
    observacoes: observacao,
    agente_id: contrato.responsavelId,
    empresa_id: empresaId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const contexto = criarContextoAuditoriaLeads({
      user,
      eventType: "create",
      action: "criar_lead",
      details: {
        mutation: "lead_create",
        payload: {
          tipo,
          origem,
          agente_id: contrato.responsavelId
        }
      }
    });

    await auditMutation("create", () => executarMutacaoComErro(() => insertLead(payload)), contexto);
  } catch (error) {
    return { error };
  }

  return { error: null, duplicateLead: null };
}

export async function salvarFichaLead({ leadId, form, user }) {
  const telefoneNormalizado = normalizarTelefone(form.telefone);
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  let leadAtual;
  try {
    leadAtual = await carregarLeadAutorizada(leadId, empresaId, user, canManageLead);
  } catch (error) {
    return { error };
  }

  if (!validarTelefone(telefoneNormalizado)) {
    return {
      error: { message: "Informe o telefone com 12 dígitos (indicativo + 9 dígitos).", invalidPhone: true }
    };
  }

  const { data: leadDuplicada, error: erroDuplicado } = await fetchLeadByTelefoneExcludingId(leadId, telefoneNormalizado, empresaId);

  if (erroDuplicado) {
    return { error: erroDuplicado };
  }

  if (leadDuplicada) {
    return {
      error: { message: "Já existe uma lead cadastrada com este telefone.", duplicatePhone: true }
    };
  }

  const updatePayload = {
    nome: form.nome,
    telefone: telefoneNormalizado,
    tipo: form.tipo,
    origem: form.origem,
    observacoes: form.observacoes,
    status: form.status,
    updated_at: new Date().toISOString()
  };

  try {
    const contexto = criarContextoAuditoriaLeads({
      user,
      leadId,
      eventType: "update",
      action: "editar_lead",
      details: {
        mutation: "lead_edit",
        statusChanged: (leadAtual?.status || null) !== (form.status || null),
        before: {
          status: leadAtual?.status || null,
          tipo: leadAtual?.tipo || null
        },
        after: {
          status: form.status || null,
          tipo: form.tipo || null
        }
      }
    });

    await auditMutation("update", () => executarMutacaoComErro(() => updateLeadById(leadId, updatePayload, empresaId)), contexto);
  } catch (error) {
    return { error };
  }

  return { error: null };
}

export async function transferirLead({ leadId, agenteId, user }) {
  try {
    const empresaId = await resolveEmpresaId(user);
    if (!hasEmpresaId(empresaId)) {
      warnMissingEmpresaId();
      return { error: buildMissingEmpresaError() };
    }

    const leadAtual = await carregarLeadAutorizada(leadId, empresaId, user, canTransferLead);
    const novoResponsavelId = agenteId || null;

    if ((leadAtual.agente_id || null) === novoResponsavelId) {
      return { error: null, data: leadAtual };
    }

    const contrato = resolverContratoIdentidade(user);
    const contexto = criarContextoAuditoriaLeads({
      user,
      leadId,
      eventType: "lead.transfer",
      action: "transferir_responsavel_lead",
      details: {
        mutation: "lead_transfer",
        origem: "FichaLead",
        lead: leadId,
        responsavelAnterior: leadAtual.agente_id || null,
        novoResponsavel: novoResponsavelId,
        utilizadorExecutor: contrato.responsavelId,
        empresa: empresaId
      }
    });

    const result = await auditMutation("lead.transfer", () => executarMutacaoComErro(() => updateLeadById(leadId, {
      agente_id: novoResponsavelId,
      updated_at: new Date().toISOString()
    }, empresaId)), contexto);

    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}
