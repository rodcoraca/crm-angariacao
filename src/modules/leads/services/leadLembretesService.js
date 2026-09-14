import { auditMutation } from "../../audit/services";
import { resolveEmpresaId, buildMissingEmpresaError, hasEmpresaId, warnMissingEmpresaId } from "../../../utils/empresaScope.js";
import { resolverContratoIdentidade } from "../utils/identityContract";
import { canManageLead } from "./leadPermissionService";
import {
  fetchLeadLembreteAtivo,
  fetchLeadLembreteById,
  fetchLeadLembretesConcluidos,
  insertLeadLembrete,
  updateLeadLembreteById
} from "../repositories/leadLembretesRepository";
import { fetchLeadById } from "../repositories/leadsRepository";

async function executarMutacaoComErro(mutationHandler) {
  const result = await mutationHandler();
  if (result?.error) throw result.error;
  return result;
}

function criarContextoAuditoriaLeadLembrete({ user, leadId, action, details = {}, eventType }) {
  const contrato = resolverContratoIdentidade(user);

  return {
    userId: contrato.responsavelId,
    empresaId: user?.empresa_id || user?.user_metadata?.empresa_id || null,
    modulo: "lead_lembretes",
    entidade: "lead_lembretes",
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

async function carregarLeadParaLembrete(leadId, empresaId, user) {
  const { data: lead, error } = await fetchLeadById(leadId, empresaId);
  if (error) throw error;
  if (!lead || !canManageLead(user, lead)) {
    throw new Error("Não possui permissões para alterar esta Lead.");
  }
  return lead;
}

export async function criarLeadLembrete({ leadId, user, dataLembrete, horaLembrete, criadoPor = null }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  try {
    await carregarLeadParaLembrete(leadId, empresaId, user);

    const contrato = resolverContratoIdentidade(user);
    const usuarioCriadorId = criadoPor || contrato.usuarioId || contrato.responsavelId || null;

    const payload = {
      lead_id: leadId,
      empresa_id: empresaId,
      criado_por: usuarioCriadorId,
      data_lembrete: dataLembrete,
      hora_lembrete: horaLembrete || null,
      estado: "ativo",
      criado_at: new Date().toISOString()
    };

    const contexto = criarContextoAuditoriaLeadLembrete({
      user,
      leadId,
      eventType: "create",
      action: "criar_lembrete",
      details: {
        mutation: "lead_reminder_create",
        before: null,
        after: {
          lead_id: leadId,
          empresa_id: empresaId,
          data_lembrete: dataLembrete,
          hora_lembrete: horaLembrete || null,
          estado: "ativo"
        }
      }
    });

    const result = await auditMutation("create", () => executarMutacaoComErro(() => insertLeadLembrete(payload, empresaId)), contexto);
    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}

export async function carregarLeadLembreteAtivo({ leadId, user }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: null };
  }

  try {
    const { data, error } = await fetchLeadLembreteAtivo(leadId, empresaId);
    if (error) return { data: null, error };
    return { data: data || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function carregarHistoricoLeadLembretes({ leadId, user }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  try {
    const { data, error } = await fetchLeadLembretesConcluidos(leadId, empresaId);
    if (error) return { data: [], error };
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function alterarLeadLembrete({ lembreteId, user, dataLembrete, horaLembrete }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  try {
    const { data: lembreteAtual, error: errorRead } = await fetchLeadLembreteById(lembreteId, empresaId);
    if (errorRead) throw errorRead;
    if (!lembreteAtual) {
      return { error: new Error("Lembrete não encontrado.") };
    }

    const contexto = criarContextoAuditoriaLeadLembrete({
      user,
      leadId: lembreteAtual.lead_id,
      eventType: "update",
      action: "alterar_lembrete",
      details: {
        mutation: "lead_reminder_update",
        before: {
          data_lembrete: lembreteAtual.data_lembrete,
          hora_lembrete: lembreteAtual.hora_lembrete,
          estado: lembreteAtual.estado
        },
        after: {
          data_lembrete: dataLembrete,
          hora_lembrete: horaLembrete || null,
          estado: "ativo"
        }
      }
    });

    const result = await auditMutation("update", () => executarMutacaoComErro(() => updateLeadLembreteById(lembreteId, {
      data_lembrete: dataLembrete,
      hora_lembrete: horaLembrete || null
    }, empresaId)), contexto);

    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}

export async function concluirLeadLembrete({ lembreteId, user }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  try {
    const { data: lembreteAtual, error: errorRead } = await fetchLeadLembreteById(lembreteId, empresaId);
    if (errorRead) throw errorRead;
    if (!lembreteAtual) {
      return { error: new Error("Lembrete não encontrado.") };
    }

    const contrato = resolverContratoIdentidade(user);
    const concluidoPor = contrato.usuarioId || contrato.responsavelId || null;

    const contexto = criarContextoAuditoriaLeadLembrete({
      user,
      leadId: lembreteAtual.lead_id,
      eventType: "update",
      action: "concluir_lembrete",
      details: {
        mutation: "lead_reminder_complete",
        before: {
          estado: lembreteAtual.estado,
          data_lembrete: lembreteAtual.data_lembrete,
          hora_lembrete: lembreteAtual.hora_lembrete
        },
        after: {
          estado: "concluido",
          concluido_at: new Date().toISOString(),
          concluido_por: concluidoPor
        }
      }
    });

    const result = await auditMutation("update", () => executarMutacaoComErro(() => updateLeadLembreteById(lembreteId, {
      estado: "concluido",
      concluido_at: new Date().toISOString(),
      concluido_por: concluidoPor
    }, empresaId)), contexto);

    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}
