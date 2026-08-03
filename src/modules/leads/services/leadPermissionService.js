import { pertenceAoMesmoContrato } from "../utils/identityContract";

const PERFIS_GESTAO_LEADS = new Set([
  "administrador",
  "diretor comercial"
]);

function normalizarPerfil(valor) {
  return String(valor || "")
    .trim()
    .toLocaleLowerCase("pt-PT");
}

function obterPermissoes(user) {
  return user?.permissoes || user?.user_metadata?.permissoes || {};
}

function possuiPrivilegioGlobalDeLeads(user) {
  const permissoes = obterPermissoes(user);
  return PERFIS_GESTAO_LEADS.has(normalizarPerfil(permissoes.__perfil));
}

export function canManageLead(user, lead) {
  if (!user || !lead) return false;

  return possuiPrivilegioGlobalDeLeads(user) || pertenceAoMesmoContrato(lead.agente_id, user);
}

export function canTransferLead(user, lead) {
  return canManageLead(user, lead);
}
