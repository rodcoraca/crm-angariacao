import { resolveEmpresaId, hasEmpresaId, buildMissingEmpresaError, warnMissingEmpresaId } from "../../../utils/empresaScope.js";
import {
  deleteCliente,
  fetchClientes,
  fetchUsuariosEmpresa,
  insertCliente,
  updateCliente
} from "../repositories/clientesRepository";

export const CLIENTE_PRIVATE_FIELDS = [
  "telefone_fixo",
  "telefone_movel",
  "email",
  "contacto_1",
  "telemovel_contacto_1",
  "email_contacto_1",
  "contacto_2",
  "telemovel_contacto_2",
  "email_contacto_2"
];

export function buildDefaultClienteForm() {
  return {
    responsavel_angariacao: "",
    telefone_responsavel: "",
    email_responsavel: "",
    tipo_cliente: "",
    nome_designacao: "",
    nipc: "",
    ami: "",
    telefone_fixo: "",
    telefone_movel: "",
    email: "",
    morada: "",
    numero_policia: "",
    complemento: "",
    contacto_1: "",
    telemovel_contacto_1: "",
    email_contacto_1: "",
    contacto_2: "",
    telemovel_contacto_2: "",
    email_contacto_2: ""
  };
}

export function mapClienteParaFormulario(cliente = {}) {
  return {
    responsavel_angariacao: cliente?.responsavel_angariacao || "",
    telefone_responsavel: cliente?.telefone_responsavel || "",
    email_responsavel: cliente?.email_responsavel || "",
    tipo_cliente: cliente?.tipo_cliente || "",
    nome_designacao: cliente?.nome_designacao || "",
    nipc: cliente?.nipc || "",
    ami: cliente?.ami || "",
    telefone_fixo: cliente?.telefone_fixo || "",
    telefone_movel: cliente?.telefone_movel || "",
    email: cliente?.email || "",
    morada: cliente?.morada || "",
    numero_policia: cliente?.numero_policia || "",
    complemento: cliente?.complemento || "",
    contacto_1: cliente?.contacto_1 || "",
    telemovel_contacto_1: cliente?.telemovel_contacto_1 || "",
    email_contacto_1: cliente?.email_contacto_1 || "",
    contacto_2: cliente?.contacto_2 || "",
    telemovel_contacto_2: cliente?.telemovel_contacto_2 || "",
    email_contacto_2: cliente?.email_contacto_2 || ""
  };
}

export function toClientePayload(form = {}, { empresaId, userProfileId, isEditing = false } = {}) {
  const payload = {
    empresa_id: empresaId,
    responsavel_angariacao: form.responsavel_angariacao || null,
    telefone_responsavel: form.telefone_responsavel || null,
    email_responsavel: form.email_responsavel || null,
    tipo_cliente: form.tipo_cliente || null,
    nome_designacao: form.nome_designacao || null,
    nipc: form.nipc || null,
    ami: form.ami || null,
    telefone_fixo: form.telefone_fixo || null,
    telefone_movel: form.telefone_movel || null,
    email: form.email || null,
    morada: form.morada || null,
    numero_policia: form.numero_policia || null,
    complemento: form.complemento || null,
    contacto_1: form.contacto_1 || null,
    telemovel_contacto_1: form.telemovel_contacto_1 || null,
    email_contacto_1: form.email_contacto_1 || null,
    contacto_2: form.contacto_2 || null,
    telemovel_contacto_2: form.telemovel_contacto_2 || null,
    email_contacto_2: form.email_contacto_2 || null
  };

  if (!isEditing) {
    payload.created_by = userProfileId || null;
  }

  payload.updated_by = userProfileId || null;
  return payload;
}

export async function fetchClientesService() {
  const empresaId = await resolveEmpresaId();
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  return fetchClientes(empresaId);
}

export async function fetchUsuariosEmpresaService() {
  const empresaId = await resolveEmpresaId();
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  return fetchUsuariosEmpresa(empresaId);
}

export async function salvarClienteService({ form, isEditing = false, clienteEdicao = null, currentUser = null }) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: buildMissingEmpresaError() };
  }

  const userProfileId = currentUser?.perfil_id || currentUser?.id || null;
  const payload = toClientePayload(form, {
    empresaId,
    userProfileId,
    isEditing
  });

  if (isEditing && clienteEdicao?.id) {
    return updateCliente(clienteEdicao.id, payload, empresaId);
  }

  return insertCliente(payload);
}

export async function excluirClienteService({ clienteId, currentUser = null }) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: buildMissingEmpresaError() };
  }

  return deleteCliente(clienteId, empresaId);
}
