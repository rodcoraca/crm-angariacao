import { auditMutation } from "../../audit/services";
import {
  buildMissingEmpresaError,
  hasEmpresaId,
  resolveEmpresaId,
  warnMissingEmpresaId
} from "../../../utils/empresaScope.js";
import {
  fetchCompromissoById,
  fetchCompromissosPorPeriodo,
  insertCompromisso,
  insertCompromissos,
  updateCompromissoById,
  updateCompromissoEstado
} from "../repositories";

async function executarMutacaoComErro(mutationHandler) {
  const result = await mutationHandler();
  if (result?.error) throw result.error;
  return result;
}

function criarContextoAuditoriaCompromisso({ user, compromissoId, action, details = {}, eventType }) {
  return {
    userId: user?.id || null,
    empresaId: user?.empresa_id || user?.user_metadata?.empresa_id || null,
    modulo: "compromissos",
    entidade: "compromissos",
    entidadeId: compromissoId || null,
    metadata: {
      action,
      eventType,
      ...details
    }
  };
}

export async function listarCompromissosPorPeriodo(user = null, filtros = {}) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  try {
    const { data, error } = await fetchCompromissosPorPeriodo(empresaId, filtros);
    if (error) return { data: [], error };
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function obterCompromissoPorId(compromissoId, user = null) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: null };
  }

  try {
    const { data, error } = await fetchCompromissoById(compromissoId, empresaId);
    if (error) return { data: null, error };
    return { data: data || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function criarCompromisso({ user, titulo, descricao = null, data, horaInicio, horaFim, usuarioId = null, estado = "pending", origemTipo = "plantao", origemId = null }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  if (!titulo || !data || !horaInicio || !horaFim) {
    return { error: new Error("Dados do compromisso inválidos.") };
  }

  try {
    const payload = {
      empresa_id: empresaId,
      titulo,
      descricao,
      data,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      usuario_id: usuarioId,
      estado,
      origem_tipo: origemTipo,
      origem_id: origemId,
      created_by: user?.id || null,
      updated_by: user?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const contexto = criarContextoAuditoriaCompromisso({
      user,
      compromissoId: null,
      eventType: "create",
      action: "criar_compromisso",
      details: {
        mutation: "compromisso_create",
        before: null,
        after: {
          titulo,
          data,
          estado,
          origem_tipo: origemTipo,
          origem_id: origemId,
          usuario_id: usuarioId
        }
      }
    });

    const result = await auditMutation("create", () => executarMutacaoComErro(() => insertCompromisso(payload)), contexto);
    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}

export async function criarCompromissosEmLote({ user, compromissos = [] }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  if (!Array.isArray(compromissos) || compromissos.length === 0) {
    return { error: new Error("Nenhum compromisso para persistir."), data: [] };
  }

  try {
    const payloads = compromissos.map((item) => ({
      empresa_id: empresaId,
      titulo: item.titulo,
      descricao: item.descricao || null,
      data: item.data,
      hora_inicio: item.horaInicio,
      hora_fim: item.horaFim,
      usuario_id: item.usuarioId || null,
      estado: item.estado || "pending",
      origem_tipo: item.origemTipo || "plantao",
      origem_id: item.origemId || null,
      created_by: user?.id || null,
      updated_by: user?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const contexto = criarContextoAuditoriaCompromisso({
      user,
      compromissoId: null,
      eventType: "create",
      action: "criar_compromissos_lote",
      details: {
        mutation: "compromisso_batch_create",
        before: null,
        after: {
          count: payloads.length,
          origem_id: payloads[0]?.origem_id || null
        }
      }
    });

    const result = await auditMutation("create", () => executarMutacaoComErro(() => insertCompromissos(payloads)), contexto);
    return { error: null, data: result?.data || [] };
  } catch (error) {
    return { error };
  }
}

export async function atualizarCompromisso({ user, compromissoId, payload }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  try {
    const { data: compromissoAtual, error: errorRead } = await fetchCompromissoById(compromissoId, empresaId);
    if (errorRead) throw errorRead;
    if (!compromissoAtual) {
      return { error: new Error("Compromisso não encontrado.") };
    }

    const updatePayload = {
      ...payload,
      updated_by: user?.id || null,
      updated_at: new Date().toISOString()
    };

    const contexto = criarContextoAuditoriaCompromisso({
      user,
      compromissoId,
      eventType: "update",
      action: "atualizar_compromisso",
      details: {
        mutation: "compromisso_update",
        before: {
          titulo: compromissoAtual.titulo,
          data: compromissoAtual.data,
          hora_inicio: compromissoAtual.hora_inicio,
          hora_fim: compromissoAtual.hora_fim,
          usuario_id: compromissoAtual.usuario_id,
          estado: compromissoAtual.estado,
          origem_tipo: compromissoAtual.origem_tipo,
          origem_id: compromissoAtual.origem_id
        },
        after: updatePayload
      }
    });

    const result = await auditMutation("update", () => executarMutacaoComErro(() => updateCompromissoById(compromissoId, updatePayload, empresaId)), contexto);
    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}

export async function alterarEstadoCompromisso({ user, compromissoId, estado }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  try {
    const { data: compromissoAtual, error: errorRead } = await fetchCompromissoById(compromissoId, empresaId);
    if (errorRead) throw errorRead;
    if (!compromissoAtual) {
      return { error: new Error("Compromisso não encontrado.") };
    }

    const contexto = criarContextoAuditoriaCompromisso({
      user,
      compromissoId,
      eventType: "update",
      action: "alterar_estado_compromisso",
      details: {
        mutation: "compromisso_state_change",
        before: {
          estado: compromissoAtual.estado
        },
        after: {
          estado
        }
      }
    });

    const result = await auditMutation("update", () => executarMutacaoComErro(() => updateCompromissoEstado(compromissoId, estado, empresaId)), contexto);
    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}
