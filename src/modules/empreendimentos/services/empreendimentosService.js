import {
  buildMissingEmpresaError,
  hasEmpresaId,
  resolveEmpresaId,
  warnMissingEmpresaId
} from "../../../utils/empresaScope.js";
import {
  deleteEmpreendimento,
  fetchEmpreendimentosByCliente,
  insertEmpreendimento,
  updateEmpreendimento
} from "../repositories/empreendimentosRepository";

export function buildDefaultEmpreendimentoForm(clienteId = null) {
  return {
    cliente_id: clienteId || "",
    nome: "",
    morada: "",
    distrito: "",
    concelho: "",
    freguesia: "",
    percentual_comissao: "",
    iva_incluido: "",
    inicio_obras: "",
    previsao_entrega: ""
  };
}

export function mapEmpreendimentoParaFormulario(empreendimento = {}) {
  return {
    cliente_id: empreendimento?.cliente_id || "",
    nome: empreendimento?.nome || "",
    morada: empreendimento?.morada || "",
    distrito: empreendimento?.distrito || "",
    concelho: empreendimento?.concelho || "",
    freguesia: empreendimento?.freguesia || "",
    percentual_comissao: empreendimento?.percentual_comissao ?? "",
    iva_incluido: empreendimento?.iva_incluido === true ? "true" : empreendimento?.iva_incluido === false ? "false" : "",
    inicio_obras: empreendimento?.inicio_obras ? String(empreendimento.inicio_obras).slice(0, 10) : "",
    previsao_entrega: empreendimento?.previsao_entrega ? String(empreendimento.previsao_entrega).slice(0, 10) : ""
  };
}

export function toEmpreendimentoPayload(form = {}, { empresaId, clienteId, userProfileId, isEditing = false } = {}) {
  const payload = {
    empresa_id: empresaId,
    cliente_id: clienteId || form.cliente_id || null,
    nome: form.nome || null,
    morada: form.morada || null,
    distrito: form.distrito || null,
    concelho: form.concelho || null,
    freguesia: form.freguesia || null,
    percentual_comissao: form.percentual_comissao !== "" && form.percentual_comissao !== null && form.percentual_comissao !== undefined
      ? Number(form.percentual_comissao)
      : null,
    iva_incluido: form.iva_incluido === "true" ? true : form.iva_incluido === true ? true : false,
    inicio_obras: form.inicio_obras || null,
    previsao_entrega: form.previsao_entrega || null
  };

  if (!isEditing) {
    payload.created_by = userProfileId || null;
  }

  payload.updated_by = userProfileId || null;
  return payload;
}

export function validarEmpreendimento(form = {}) {
  if (!String(form.nome || "").trim()) return "O nome do empreendimento é obrigatório.";
  if (!String(form.cliente_id || "").trim()) return "O cliente é obrigatório.";

  const commission = Number(form.percentual_comissao);
  if (form.percentual_comissao !== "" && form.percentual_comissao !== null && form.percentual_comissao !== undefined && Number.isNaN(commission)) {
    return "A comissão deve ser um valor numérico válido.";
  }

  if (form.inicio_obras && Number.isNaN(new Date(form.inicio_obras).getTime())) {
    return "A data de início das obras é inválida.";
  }

  if (form.previsao_entrega && Number.isNaN(new Date(form.previsao_entrega).getTime())) {
    return "A data de previsão de entrega é inválida.";
  }

  if (form.inicio_obras && form.previsao_entrega) {
    const inicio = new Date(form.inicio_obras);
    const previsao = new Date(form.previsao_entrega);
    if (previsao < inicio) {
      return "A previsão de entrega deve ser igual ou posterior ao início das obras.";
    }
  }

  return "";
}

export async function fetchEmpreendimentosService(clienteId) {
  const empresaId = await resolveEmpresaId();
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  return fetchEmpreendimentosByCliente(clienteId, empresaId);
}

export async function salvarEmpreendimentoService({ form, clienteId, isEditing = false, empreendimentoEdicao = null, currentUser = null }) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: buildMissingEmpresaError() };
  }

  const userProfileId = currentUser?.perfil_id || currentUser?.id || null;
  const payload = toEmpreendimentoPayload(form, {
    empresaId,
    clienteId: clienteId || empreendimentoEdicao?.cliente_id || form.cliente_id,
    userProfileId,
    isEditing
  });

  if (isEditing && empreendimentoEdicao?.id) {
    return updateEmpreendimento(empreendimentoEdicao.id, payload, empresaId);
  }

  return insertEmpreendimento(payload);
}

export async function excluirEmpreendimentoService({ empreendimentoId, currentUser = null }) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: buildMissingEmpresaError() };
  }

  return deleteEmpreendimento(empreendimentoId, empresaId);
}
