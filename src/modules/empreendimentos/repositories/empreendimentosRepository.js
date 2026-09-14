import { supabase } from "../../../supabase";
import { applyEmpresaScope } from "../../../utils/empresaScope.js";

const EMPREENDIMENTOS_TABLE = "empreendimentos";
const FICHEIROS_TABLE = "imovel_ficheiros";
const STORAGE_BUCKET = "crm-imoveis";

export function fetchEmpreendimentosByCliente(clienteId, empresaId = null) {
  if (!clienteId) {
    return Promise.resolve({ data: [], error: null });
  }

  return applyEmpresaScope(
    supabase
      .from(EMPREENDIMENTOS_TABLE)
      .select("*")
      .eq("cliente_id", clienteId),
    empresaId
  ).order("created_at", { ascending: false });
}

export function fetchFicheirosByEmpreendimentoId(empreendimentoId, empresaId = null) {
  if (!empreendimentoId) {
    return Promise.resolve({ data: [], error: null });
  }

  return applyEmpresaScope(
    supabase
      .from(FICHEIROS_TABLE)
      .select("*")
      .eq("entidade_tipo", "empreendimento")
      .eq("entidade_id", empreendimentoId),
    empresaId
  ).order("created_at", { ascending: false });
}

export function insertEmpreendimento(payload) {
  return supabase
    .from(EMPREENDIMENTOS_TABLE)
    .insert([payload])
    .select();
}

export function updateEmpreendimento(empreendimentoId, payload, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from(EMPREENDIMENTOS_TABLE)
      .update(payload)
      .eq("id", empreendimentoId)
      .select(),
    empresaId
  );
}

export function deleteEmpreendimento(empreendimentoId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from(EMPREENDIMENTOS_TABLE)
      .delete()
      .eq("id", empreendimentoId)
      .select(),
    empresaId
  );
}

export function insertEmpreendimentoFicheiro(payload) {
  return supabase
    .from(FICHEIROS_TABLE)
    .insert([payload])
    .select();
}

export function updateEmpreendimentoFicheiro(ficheiroId, payload, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from(FICHEIROS_TABLE)
      .update(payload)
      .eq("id", ficheiroId)
      .select(),
    empresaId
  );
}

export function deleteEmpreendimentoFicheiro(ficheiroId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from(FICHEIROS_TABLE)
      .delete()
      .eq("id", ficheiroId),
    empresaId
  );
}

export function deleteEmpreendimentoFicheirosByEmpreendimentoId(empreendimentoId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from(FICHEIROS_TABLE)
      .delete()
      .eq("entidade_tipo", "empreendimento")
      .eq("entidade_id", empreendimentoId),
    empresaId
  );
}

export function removeStorageFiles(paths = []) {
  const normalized = (paths || []).filter(Boolean);
  if (!normalized.length) {
    return Promise.resolve({ data: [], error: null });
  }

  return supabase.storage
    .from(STORAGE_BUCKET)
    .remove(normalized);
}

export function uploadEmpreendimentoStorageFile(nomeArquivo, file) {
  return supabase.storage
    .from(STORAGE_BUCKET)
    .upload(nomeArquivo, file);
}

export function getEmpreendimentoStoragePublicUrl(path) {
  return supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);
}
