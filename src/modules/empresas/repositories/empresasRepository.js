import { supabase } from "../../../supabase";

const EMPRESAS_TABLE = "empresas";
const USERS_TABLE = "usuarios";
const LEADS_TABLE = "leads";
const PROVIDER_LEADS_TABLE = "provider_leads";

export async function listEmpresasRepository() {
  return supabase
    .from(EMPRESAS_TABLE)
    .select("id,nome,slug,estado,created_at,updated_at")
    .order("nome", { ascending: true });
}

export async function createEmpresaRepository(payload) {
  return supabase
    .from(EMPRESAS_TABLE)
    .insert([payload])
    .select("id,nome,slug,estado,created_at,updated_at")
    .maybeSingle();
}

export async function updateEmpresaRepository(empresaId, payload) {
  return supabase
    .from(EMPRESAS_TABLE)
    .update(payload)
    .eq("id", empresaId)
    .select("id,nome,slug,estado,created_at,updated_at")
    .maybeSingle();
}

export async function listUsuariosForEmpresaAssociationRepository() {
  return supabase
    .from(USERS_TABLE)
    .select("id,nome,apelido,email,empresa_id,updated_at")
    .order("nome", { ascending: true });
}

export async function listLeadsForEmpresaIndicatorsRepository() {
  return supabase
    .from(LEADS_TABLE)
    .select("id,empresa_id");
}

export async function listProviderLeadsForEmpresaIndicatorsRepository() {
  return supabase
    .from(PROVIDER_LEADS_TABLE)
    .select("id,empresa_id");
}

export async function associateUsuarioEmpresaRepository(usuarioId, empresaId) {
  return supabase
    .from(USERS_TABLE)
    .update({
      empresa_id: empresaId,
      updated_at: new Date().toISOString()
    })
    .eq("id", usuarioId)
    .select("id,nome,apelido,email,empresa_id,updated_at")
    .maybeSingle();
}
