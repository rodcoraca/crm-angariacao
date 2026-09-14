import { auditMutation } from "../../audit/services";
import {
  buildMissingEmpresaError,
  hasEmpresaId,
  resolveEmpresaId,
  warnMissingEmpresaId
} from "../../../utils/empresaScope.js";
import {
  deleteParticipanteServicoById,
  fetchParticipanteServicoById,
  fetchParticipantesServico,
  insertParticipanteServico,
  updateParticipanteServicoById
} from "../repositories";

async function executarMutacaoComErro(mutationHandler) {
  const result = await mutationHandler();
  if (result?.error) throw result.error;
  return result;
}

function criarContextoAuditoriaParticipante({ user, servicoId, participanteId, action, details = {}, eventType }) {
  return {
    userId: user?.id || null,
    empresaId: user?.empresa_id || user?.user_metadata?.empresa_id || null,
    modulo: "servicos",
    entidade: "servico_participantes",
    entidadeId: participanteId || null,
    metadata: {
      action,
      eventType,
      servico_id: servicoId || null,
      ...details
    }
  };
}

export async function listarParticipantesServico(servicoId, user = null) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  try {
    const { data, error } = await fetchParticipantesServico(servicoId, empresaId);
    if (error) return { data: [], error };
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function adicionarParticipanteServico({ user, servicoId, usuarioId, ativo = true }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  if (!servicoId || !usuarioId) {
    return { error: new Error("Dados do participante inválidos.") };
  }

  try {
    const payload = {
      empresa_id: empresaId,
      servico_id: servicoId,
      usuario_id: usuarioId,
      ativo,
      created_by: user?.id || null,
      created_at: new Date().toISOString()
    };

    const contexto = criarContextoAuditoriaParticipante({
      user,
      servicoId,
      participanteId: null,
      eventType: "create",
      action: "adicionar_participante_servico",
      details: {
        mutation: "servico_participante_create",
        before: null,
        after: {
          servico_id: servicoId,
          usuario_id: usuarioId,
          ativo
        }
      }
    });

    const result = await auditMutation("create", () => executarMutacaoComErro(() => insertParticipanteServico(payload)), contexto);
    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}

export async function removerParticipanteServico({ user, participanteId, servicoId }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  try {
    const { data: participanteAtual, error: errorRead } = await fetchParticipanteServicoById(participanteId, empresaId);
    if (errorRead) throw errorRead;
    if (!participanteAtual) {
      return { error: new Error("Participante não encontrado.") };
    }

    const contexto = criarContextoAuditoriaParticipante({
      user,
      servicoId: servicoId || participanteAtual.servico_id,
      participanteId,
      eventType: "delete",
      action: "remover_participante_servico",
      details: {
        mutation: "servico_participante_delete",
        before: {
          servico_id: participanteAtual.servico_id,
          usuario_id: participanteAtual.usuario_id,
          ativo: participanteAtual.ativo
        },
        after: null
      }
    });

    const result = await auditMutation("delete", () => executarMutacaoComErro(() => deleteParticipanteServicoById(participanteId, empresaId)), contexto);
    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}

export async function atualizarParticipanteServico({ user, participanteId, payload }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  try {
    const { data: participanteAtual, error: errorRead } = await fetchParticipanteServicoById(participanteId, empresaId);
    if (errorRead) throw errorRead;
    if (!participanteAtual) {
      return { error: new Error("Participante não encontrado.") };
    }

    const result = await auditMutation("update", () => executarMutacaoComErro(() => updateParticipanteServicoById(participanteId, payload, empresaId)), {
      userId: user?.id || null,
      empresaId: empresaId,
      modulo: "servicos",
      entidade: "servico_participantes",
      entidadeId: participanteId,
      metadata: {
        action: "atualizar_participante_servico",
        eventType: "update",
        before: {
          ativo: participanteAtual.ativo
        },
        after: payload
      }
    });

    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}
