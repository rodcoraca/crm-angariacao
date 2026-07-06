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

async function executarMutacaoComErro(mutationHandler) {
  const result = await mutationHandler();
  if (result?.error) throw result.error;
  return result;
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
    empresaId: user?.user_metadata?.empresa_id || null,
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
  const { data, error } = await fetchLeadsByTipo(tipo);

  if (error) return { data: [], error };
  return { data: data || [], error: null };
}

export async function carregarLeadsDashboard() {
  const { data, error } = await fetchDashboardLeads();

  if (error) return { data: [], error };
  return { data: data || [], error: null };
}

export async function alterarTipoLead(leadId, novoTipo, user, leadAnterior = null) {
  try {
    const contexto = criarContextoAuditoriaLeads({
      user,
      leadId,
      eventType: "update",
      action: "alterar_estado_lead",
      details: {
        mutation: "state_change",
        before: {
          tipo: leadAnterior?.tipo || null
        },
        after: {
          tipo: novoTipo
        }
      }
    });

    const result = await auditMutation("update", () => executarMutacaoComErro(() => updateLeadById(leadId, {
      tipo: novoTipo,
      updated_at: new Date().toISOString()
    })), contexto);

    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}

export async function salvarObservacaoLead(leadId, observacoes, user) {
  try {
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
    })), contexto);

    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}

export async function carregarFichaLead(leadId) {
  const { data, error } = await fetchLeadById(leadId);
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

  const { data, error } = await fetchLeadByTelefone(telefone);

  if (error) return { lead: null, error };

  return { lead: data || null, error: null };
}

export async function salvarLeadFluxo({ nome, telefone, tipo, origem, observacao, user }) {
  const telefoneNormalizado = normalizarTelefone(telefone);

  if (!validarTelefone(telefoneNormalizado)) {
    return {
      error: { message: "Informe o telefone com 12 dígitos (indicativo + 9 dígitos).\n", invalidPhone: true }
    };
  }

  const leadExistenteResult = await verificarLeadExistente(telefoneNormalizado);
  if (leadExistenteResult.error) return { error: leadExistenteResult.error };

  if (leadExistenteResult.lead) {
    return { duplicateLead: leadExistenteResult.lead, error: null };
  }

  const contrato = resolverContratoIdentidade(user);

  const payload = {
    nome,
    telefone: telefoneNormalizado,
    tipo,
    origem,
    observacoes: observacao,
    agente_id: contrato.responsavelId,
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

export async function salvarFichaLead({ leadId, form, user, leadAtual = null }) {
  const telefoneNormalizado = normalizarTelefone(form.telefone);

  if (!validarTelefone(telefoneNormalizado)) {
    return {
      error: { message: "Informe o telefone com 12 dígitos (indicativo + 9 dígitos).", invalidPhone: true }
    };
  }

  const { data: leadDuplicada, error: erroDuplicado } = await fetchLeadByTelefoneExcludingId(leadId, telefoneNormalizado);

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
    agente_id: form.agente_id || null,
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
        responsavelChanged: (leadAtual?.agente_id || null) !== (form.agente_id || null),
        before: {
          status: leadAtual?.status || null,
          agente_id: leadAtual?.agente_id || null,
          tipo: leadAtual?.tipo || null
        },
        after: {
          status: form.status || null,
          agente_id: form.agente_id || null,
          tipo: form.tipo || null
        }
      }
    });

    await auditMutation("update", () => executarMutacaoComErro(() => updateLeadById(leadId, updatePayload)), contexto);
  } catch (error) {
    return { error };
  }

  return { error: null };
}
