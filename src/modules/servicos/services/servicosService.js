import { auditMutation } from "../../audit/services";
import {
  buildMissingEmpresaError,
  hasEmpresaId,
  resolveEmpresaId,
  warnMissingEmpresaId
} from "../../../utils/empresaScope.js";
import {
  fetchServicoById,
  fetchServicosEmpresa,
  insertServico,
  updateServicoAtivo,
  updateServicoById
} from "../repositories";

async function executarMutacaoComErro(mutationHandler) {
  const result = await mutationHandler();
  if (result?.error) throw result.error;
  return result;
}

function criarContextoAuditoriaServico({ user, servicoId, action, details = {}, eventType }) {
  return {
    userId: user?.id || null,
    empresaId: user?.empresa_id || user?.user_metadata?.empresa_id || null,
    modulo: "servicos",
    entidade: "servicos",
    entidadeId: servicoId || null,
    metadata: {
      action,
      eventType,
      ...details
    }
  };
}

export async function listarServicosEmpresa(user = null) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  try {
    const { data, error } = await fetchServicosEmpresa(empresaId);
    if (error) return { data: [], error };
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function obterServicoPorId(servicoId, user = null) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: null };
  }

  try {
    const { data, error } = await fetchServicoById(servicoId, empresaId);
    if (error) return { data: null, error };
    return { data: data || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function criarServico({ user, nome, descricao = null, ativo = true, horaInicio, horaFim, diasSemana }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  if (!nome || !horaInicio || !horaFim || !Array.isArray(diasSemana) || diasSemana.length === 0) {
    return { error: new Error("Dados do serviço inválidos.") };
  }

  try {
    const payload = {
      empresa_id: empresaId,
      nome,
      descricao,
      ativo,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      dias_semana: diasSemana,
      created_by: user?.id || null,
      updated_by: user?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const contexto = criarContextoAuditoriaServico({
      user,
      servicoId: null,
      eventType: "create",
      action: "criar_servico",
      details: {
        mutation: "servico_create",
        before: null,
        after: {
          empresa_id: empresaId,
          nome,
          ativo,
          hora_inicio: horaInicio,
          hora_fim: horaFim
        }
      }
    });

    const result = await auditMutation("create", () => executarMutacaoComErro(() => insertServico(payload)), contexto);
    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}

export async function atualizarServico({ user, servicoId, payload }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  try {
    const { data: servicoAtual, error: errorRead } = await fetchServicoById(servicoId, empresaId);
    if (errorRead) throw errorRead;
    if (!servicoAtual) {
      return { error: new Error("Serviço não encontrado.") };
    }

    const updatePayload = {
      ...payload,
      updated_by: user?.id || null,
      updated_at: new Date().toISOString()
    };

    const contexto = criarContextoAuditoriaServico({
      user,
      servicoId,
      eventType: "update",
      action: "atualizar_servico",
      details: {
        mutation: "servico_update",
        before: {
          nome: servicoAtual.nome,
          descricao: servicoAtual.descricao,
          ativo: servicoAtual.ativo,
          hora_inicio: servicoAtual.hora_inicio,
          hora_fim: servicoAtual.hora_fim,
          dias_semana: servicoAtual.dias_semana
        },
        after: {
          ...updatePayload
        }
      }
    });

    const result = await auditMutation("update", () => executarMutacaoComErro(() => updateServicoById(servicoId, updatePayload, empresaId)), contexto);
    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}

export async function ativarDesativarServico({ user, servicoId, ativo }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  try {
    const { data: servicoAtual, error: errorRead } = await fetchServicoById(servicoId, empresaId);
    if (errorRead) throw errorRead;
    if (!servicoAtual) {
      return { error: new Error("Serviço não encontrado.") };
    }

    const contexto = criarContextoAuditoriaServico({
      user,
      servicoId,
      eventType: "update",
      action: ativo ? "ativar_servico" : "desativar_servico",
      details: {
        mutation: "servico_toggle_active",
        before: {
          ativo: servicoAtual.ativo
        },
        after: {
          ativo
        }
      }
    });

    const result = await auditMutation("update", () => executarMutacaoComErro(() => updateServicoAtivo(servicoId, ativo, empresaId)), contexto);
    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}
