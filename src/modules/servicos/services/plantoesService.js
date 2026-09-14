import { auditMutation } from "../../audit/services";
import {
  buildMissingEmpresaError,
  hasEmpresaId,
  resolveEmpresaId,
  warnMissingEmpresaId
} from "../../../utils/empresaScope.js";
import {
  atualizarCompromisso,
  criarCompromisso,
  obterCompromissoPorId,
} from "./compromissosService";
import {
  fetchPlantaoById,
  fetchPlantoesPorPeriodo,
  fetchEscalaPlantaoPorPeriodo,
  fetchEscalasPlantaoPublicadas,
  fetchEscalaPlantaoPublicadaById,
  insertPlantao,
  publicarEscalaPlantao as publicarEscalaPlantaoRepository,
  substituirEscalaPlantao as substituirEscalaPlantaoRepository,
  updatePlantaoById,
  updatePlantaoEstado,
  updatePlantaoUsuario
} from "../repositories";

async function executarMutacaoComErro(mutationHandler) {
  const result = await mutationHandler();
  if (result?.error) throw result.error;
  return result;
}

function mapearEstadoPlantaoParaCompromisso(estado) {
  switch (estado) {
    case "scheduled":
      return "pending";
    case "confirmed":
      return "confirmed";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

function criarTituloCompromisso({ data, servicoId = null }) {
  const dataLabel = data ? new Date(`${data}T00:00:00`).toLocaleDateString("pt-PT") : "Plantão";
  if (servicoId) {
    return `Plantão - ${dataLabel} (${String(servicoId).slice(0, 8)})`;
  }
  return `Plantão - ${dataLabel}`;
}

function criarPayloadSincronizacaoCompromisso({
  empresaId,
  plantao,
  override = {},
  incluirTitulo = false
}) {
  const estadoCompromisso = override.estado ?? mapearEstadoPlantaoParaCompromisso(plantao?.estado || "scheduled");

  const payload = {
    empresa_id: empresaId,
    data: override.data ?? plantao?.data ?? null,
    hora_inicio: override.hora_inicio ?? plantao?.hora_inicio ?? null,
    hora_fim: override.hora_fim ?? plantao?.hora_fim ?? null,
    usuario_id: override.usuario_id ?? plantao?.usuario_id ?? null,
    estado: estadoCompromisso,
    origem_tipo: override.origem_tipo ?? "plantao",
    origem_id: override.origem_id ?? plantao?.id ?? null,
  };

  if (incluirTitulo) {
    payload.titulo = override.titulo ?? criarTituloCompromisso({
      data: payload.data,
      servicoId: plantao?.servico_id ?? null
    });
  }

  return payload;
}

function criarContextoAuditoriaPlantao({ user, plantaoId, action, details = {}, eventType }) {
  return {
    userId: user?.id || null,
    empresaId: user?.empresa_id || user?.user_metadata?.empresa_id || null,
    modulo: "plantoes",
    entidade: "plantoes",
    entidadeId: plantaoId || null,
    metadata: {
      action,
      eventType,
      ...details
    }
  };
}

export async function listarPlantoesPorPeriodo(user = null, filtros = {}) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  try {
    const { data, error } = await fetchPlantoesPorPeriodo(empresaId, filtros);
    if (error) return { data: [], error };
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function obterPlantaoPorId(plantaoId, user = null) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: null };
  }

  try {
    const { data, error } = await fetchPlantaoById(plantaoId, empresaId);
    if (error) return { data: null, error };
    return { data: data || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function criarPlantao({ user, servicoId, data, horaInicio, horaFim, usuarioId = null, estado = "scheduled", compromissoId = null }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  if (!servicoId || !data || !horaInicio || !horaFim) {
    return { error: new Error("Dados do plantão inválidos.") };
  }

  try {
    const payload = {
      empresa_id: empresaId,
      servico_id: servicoId,
      data,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      usuario_id: usuarioId,
      estado,
      compromisso_id: compromissoId,
      created_by: user?.id || null,
      updated_by: user?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const contexto = criarContextoAuditoriaPlantao({
      user,
      plantaoId: null,
      eventType: "create",
      action: "criar_plantao",
      details: {
        mutation: "plantao_create",
        before: null,
        after: {
          servico_id: servicoId,
          data,
          estado,
          usuario_id: usuarioId
        }
      }
    });

    const result = await auditMutation("create", () => executarMutacaoComErro(() => insertPlantao(payload)), contexto);
    const plantaoCriado = Array.isArray(result?.data) ? result.data[0] : result?.data || null;

    if (!plantaoCriado?.id) {
      return { error: new Error("Plantão criado, mas não foi possível obter o identificador do plantão.") };
    }

    const compromissoPayload = criarPayloadSincronizacaoCompromisso({
      empresaId,
      plantao: {
        id: plantaoCriado.id,
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        usuario_id: usuarioId,
        estado,
        servico_id: servicoId
      },
      override: {
        titulo: criarTituloCompromisso({ data, servicoId }),
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        usuario_id: usuarioId,
        estado: mapearEstadoPlantaoParaCompromisso(estado),
        origem_tipo: "plantao",
        origem_id: plantaoCriado.id,
      },
      incluirTitulo: true
    });

    const compromissoResult = await criarCompromisso({
      user,
      titulo: compromissoPayload.titulo,
      data: compromissoPayload.data,
      horaInicio: compromissoPayload.hora_inicio,
      horaFim: compromissoPayload.hora_fim,
      usuarioId: compromissoPayload.usuario_id,
      estado: compromissoPayload.estado,
      origemTipo: compromissoPayload.origem_tipo,
      origemId: compromissoPayload.origem_id,
      empresaId: compromissoPayload.empresa_id
    });

    if (compromissoResult.error) {
      return {
        error: new Error(`Plantão criado, mas falhou a criação do compromisso associado: ${compromissoResult.error.message || "erro desconhecido"}.`)
      };
    }

    const compromissoCriado = Array.isArray(compromissoResult.data) ? compromissoResult.data[0] : compromissoResult.data || null;
    if (!compromissoCriado?.id) {
      return {
        error: new Error("Plantão criado, mas o compromisso associado não retornou identificador válido.")
      };
    }

    const updateCompromissoIdResult = await updatePlantaoById(
      plantaoCriado.id,
      {
        compromisso_id: compromissoCriado.id,
        updated_at: new Date().toISOString()
      },
      empresaId
    );

    if (updateCompromissoIdResult?.error) {
      return {
        error: new Error(`Plantão criado, mas não foi possível vincular o compromisso ao plantão: ${updateCompromissoIdResult.error.message || "erro desconhecido"}.`)
      };
    }

    return {
      error: null,
      data: {
        ...plantaoCriado,
        compromisso_id: compromissoCriado.id
      }
    };
  } catch (error) {
    return { error };
  }
}

export async function atualizarPlantao({ user, plantaoId, payload }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  try {
    const { data: plantaoAtual, error: errorRead } = await fetchPlantaoById(plantaoId, empresaId);
    if (errorRead) throw errorRead;
    if (!plantaoAtual) {
      return { error: new Error("Plantão não encontrado.") };
    }

    const updatePayload = {
      ...payload,
      updated_by: user?.id || null,
      updated_at: new Date().toISOString()
    };

    const contexto = criarContextoAuditoriaPlantao({
      user,
      plantaoId,
      eventType: "update",
      action: "atualizar_plantao",
      details: {
        mutation: "plantao_update",
        before: {
          servico_id: plantaoAtual.servico_id,
          data: plantaoAtual.data,
          hora_inicio: plantaoAtual.hora_inicio,
          hora_fim: plantaoAtual.hora_fim,
          usuario_id: plantaoAtual.usuario_id,
          estado: plantaoAtual.estado
        },
        after: updatePayload
      }
    });

    const result = await auditMutation("update", () => executarMutacaoComErro(() => updatePlantaoById(plantaoId, updatePayload, empresaId)), contexto);

    if (plantaoAtual.compromisso_id) {
      const compromissoAtualResult = await obterCompromissoPorId(plantaoAtual.compromisso_id, user);
      if (compromissoAtualResult.error || !compromissoAtualResult.data) {
        return {
          error: new Error("Plantão atualizado, mas não foi possível localizar o compromisso associado.")
        };
      }

      const compromissoPayload = criarPayloadSincronizacaoCompromisso({
        empresaId,
        plantao: {
          id: plantaoAtual.id,
          data: updatePayload.data || plantaoAtual.data,
          hora_inicio: updatePayload.hora_inicio || plantaoAtual.hora_inicio,
          hora_fim: updatePayload.hora_fim || plantaoAtual.hora_fim,
          usuario_id: updatePayload.usuario_id ?? plantaoAtual.usuario_id,
          estado: updatePayload.estado || plantaoAtual.estado,
          servico_id: updatePayload.servico_id || plantaoAtual.servico_id
        },
        override: {
          titulo: criarTituloCompromisso({
            data: updatePayload.data || plantaoAtual.data,
            servicoId: updatePayload.servico_id || plantaoAtual.servico_id
          }),
          data: updatePayload.data || plantaoAtual.data,
          hora_inicio: updatePayload.hora_inicio || plantaoAtual.hora_inicio,
          hora_fim: updatePayload.hora_fim || plantaoAtual.hora_fim,
          usuario_id: updatePayload.usuario_id ?? plantaoAtual.usuario_id,
          estado: mapearEstadoPlantaoParaCompromisso(updatePayload.estado || plantaoAtual.estado),
          origem_tipo: compromissoAtualResult.data.origem_tipo || "plantao",
          origem_id: plantaoAtual.id,
        },
        incluirTitulo: true
      });

      const compromissoResult = await atualizarCompromisso({
        user,
        compromissoId: plantaoAtual.compromisso_id,
        payload: compromissoPayload
      });

      if (compromissoResult.error) {
        return {
          error: new Error(`Plantão atualizado, mas falhou a sincronização do compromisso associado: ${compromissoResult.error.message || "erro desconhecido"}.`)
        };
      }
    }

    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}

export async function alterarEstadoPlantao({ user, plantaoId, estado }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  try {
    const { data: plantaoAtual, error: errorRead } = await fetchPlantaoById(plantaoId, empresaId);
    if (errorRead) throw errorRead;
    if (!plantaoAtual) {
      return { error: new Error("Plantão não encontrado.") };
    }

    const contexto = criarContextoAuditoriaPlantao({
      user,
      plantaoId,
      eventType: "update",
      action: "alterar_estado_plantao",
      details: {
        mutation: "plantao_state_change",
        before: {
          estado: plantaoAtual.estado
        },
        after: {
          estado
        }
      }
    });

    const result = await auditMutation("update", () => executarMutacaoComErro(() => updatePlantaoEstado(plantaoId, estado, empresaId)), contexto);

    if (plantaoAtual.compromisso_id) {
      const compromissoAtualResult = await obterCompromissoPorId(plantaoAtual.compromisso_id, user);
      if (compromissoAtualResult.error || !compromissoAtualResult.data) {
        return {
          error: new Error("Plantão atualizado, mas não foi possível localizar o compromisso associado para sincronizar o estado.")
        };
      }

      const compromissoPayload = criarPayloadSincronizacaoCompromisso({
        empresaId,
        plantao: {
          id: plantaoAtual.id,
          data: plantaoAtual.data,
          hora_inicio: plantaoAtual.hora_inicio,
          hora_fim: plantaoAtual.hora_fim,
          usuario_id: plantaoAtual.usuario_id,
          estado,
          servico_id: plantaoAtual.servico_id
        },
        override: {
          titulo: criarTituloCompromisso({
            data: plantaoAtual.data,
            servicoId: plantaoAtual.servico_id
          }),
          data: plantaoAtual.data,
          hora_inicio: plantaoAtual.hora_inicio,
          hora_fim: plantaoAtual.hora_fim,
          usuario_id: plantaoAtual.usuario_id,
          estado: mapearEstadoPlantaoParaCompromisso(estado),
          origem_tipo: compromissoAtualResult.data.origem_tipo || "plantao",
          origem_id: plantaoAtual.id,
        },
        incluirTitulo: true
      });

      const compromissoResult = await atualizarCompromisso({
        user,
        compromissoId: plantaoAtual.compromisso_id,
        payload: compromissoPayload
      });

      if (compromissoResult.error) {
        return {
          error: new Error(`Plantão atualizado, mas falhou a sincronização do estado do compromisso associado: ${compromissoResult.error.message || "erro desconhecido"}.`)
        };
      }
    }

    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}

export async function atribuirUsuarioPlantao({ user, plantaoId, usuarioId }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  try {
    const { data: plantaoAtual, error: errorRead } = await fetchPlantaoById(plantaoId, empresaId);
    if (errorRead) throw errorRead;
    if (!plantaoAtual) {
      return { error: new Error("Plantão não encontrado.") };
    }

    const contexto = criarContextoAuditoriaPlantao({
      user,
      plantaoId,
      eventType: "update",
      action: "atribuir_usuario_plantao",
      details: {
        mutation: "plantao_assign_user",
        before: {
          usuario_id: plantaoAtual.usuario_id
        },
        after: {
          usuario_id: usuarioId
        }
      }
    });

    const result = await auditMutation("update", () => executarMutacaoComErro(() => updatePlantaoUsuario(plantaoId, usuarioId, empresaId)), contexto);

    if (plantaoAtual.compromisso_id) {
      const compromissoAtualResult = await obterCompromissoPorId(plantaoAtual.compromisso_id, user);
      if (compromissoAtualResult.error || !compromissoAtualResult.data) {
        return {
          error: new Error("Plantão atualizado, mas não foi possível localizar o compromisso associado para atribuição do utilizador.")
        };
      }

      const compromissoPayload = criarPayloadSincronizacaoCompromisso({
        empresaId,
        plantao: {
          id: plantaoAtual.id,
          data: plantaoAtual.data,
          hora_inicio: plantaoAtual.hora_inicio,
          hora_fim: plantaoAtual.hora_fim,
          usuario_id: plantaoAtual.usuario_id,
          estado: plantaoAtual.estado,
          servico_id: plantaoAtual.servico_id
        },
        override: {
          titulo: criarTituloCompromisso({
            data: plantaoAtual.data,
            servicoId: plantaoAtual.servico_id
          }),
          data: plantaoAtual.data,
          hora_inicio: plantaoAtual.hora_inicio,
          hora_fim: plantaoAtual.hora_fim,
          usuario_id: usuarioId,
          estado: mapearEstadoPlantaoParaCompromisso(plantaoAtual.estado),
          origem_tipo: compromissoAtualResult.data.origem_tipo || "plantao",
          origem_id: plantaoAtual.id,
        },
        incluirTitulo: true
      });

      const compromissoResult = await atualizarCompromisso({
        user,
        compromissoId: plantaoAtual.compromisso_id,
        payload: compromissoPayload
      });

      if (compromissoResult.error) {
        return {
          error: new Error(`Plantão atualizado, mas falhou a sincronização do utilizador no compromisso associado: ${compromissoResult.error.message || "erro desconhecido"}.`)
        };
      }
    }

    return { error: null, data: result?.data || null };
  } catch (error) {
    return { error };
  }
}

function validarPeriodoPlantao(periodoInicio, periodoFim) {
  const inicio = new Date(`${periodoInicio}T00:00:00Z`);
  const fim = new Date(`${periodoFim}T00:00:00Z`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim < inicio) return false;
  let sabados = 0;
  for (const cursor = new Date(inicio); cursor <= fim; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (cursor.getUTCDay() === 6) sabados += 1;
  }
  return sabados >= 4;
}

export async function listarEscalaPlantaoPorPeriodo({ user, periodoInicio, periodoFim }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) return { data: null, error: null };

  try {
    const { data, error } = await fetchEscalaPlantaoPorPeriodo(empresaId, periodoInicio, periodoFim);
    if (error) return { data: null, error };
    const linhas = data || [];
    if (linhas.length === 0) return { data: null, error: null };
    const escala = linhas.find((linha) => linha.escala_estado === "rascunho") || linhas[0];
    return {
      data: {
        escala_id: escala.escala_id,
        periodo_inicio: escala.periodo_inicio,
        periodo_fim: escala.periodo_fim,
        escala_estado: escala.escala_estado,
        published_at: escala.published_at,
        published_by: escala.published_by,
        linhas: linhas.filter((linha) => linha.escala_id === escala.escala_id),
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

export async function substituirEscalaPlantao({ user, periodoInicio, periodoFim, linhas = [] }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) return { data: null, error: buildMissingEmpresaError() };
  if (!validarPeriodoPlantao(periodoInicio, periodoFim)) {
    return { data: null, error: new Error("O período deve conter pelo menos 4 sábados.") };
  }
  if (!Array.isArray(linhas) || linhas.length < 4) {
    return { data: null, error: new Error("O plantão deve conter pelo menos 4 sábados.") };
  }

  try {
    const { data, error } = await substituirEscalaPlantaoRepository(periodoInicio, periodoFim, linhas);
    return { data: data || null, error: error || null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function publicarEscalaPlantao({ user, escalaId }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) return { data: null, error: buildMissingEmpresaError() };
  if (!escalaId) return { data: null, error: new Error("Escala de plantão inválida.") };

  try {
    const { data, error } = await publicarEscalaPlantaoRepository(escalaId);
    return { data: data || null, error: error || null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function listarPlantoesPublicados({ user }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) return { data: [], error: null };

  try {
    const { data, error } = await fetchEscalasPlantaoPublicadas(empresaId);
    if (error) return { data: [], error };
    const agrupado = new Map();
    (data || []).forEach((linha) => {
      if (!agrupado.has(linha.escala_id)) agrupado.set(linha.escala_id, { ...linha, linhas: [] });
      agrupado.get(linha.escala_id).linhas.push(linha);
    });
    return { data: [...agrupado.values()], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function obterPlantaoPublicado({ user, escalaId }) {
  const empresaId = await resolveEmpresaId(user);
  if (!hasEmpresaId(empresaId)) return { data: null, error: null };

  try {
    const { data, error } = await fetchEscalaPlantaoPublicadaById(empresaId, escalaId);
    if (error) return { data: null, error };
    const linhas = data || [];
    return { data: linhas[0] ? { ...linhas[0], linhas } : null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
