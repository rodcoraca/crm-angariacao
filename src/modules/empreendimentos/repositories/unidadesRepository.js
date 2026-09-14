import { supabase } from "../../../supabase";
import { applyEmpresaScope } from "../../../utils/empresaScope.js";

const UNIDADES_TABLE = "unidades";
const FICHEIROS_TABLE = "imovel_ficheiros";
const STORAGE_BUCKET = "crm-imoveis";

export function fetchUnidadesByEmpreendimento(empreendimentoId, empresaId = null) {
  if (!empreendimentoId) {
    return Promise.resolve({ data: [], error: null });
  }

  return applyEmpresaScope(
    supabase
      .from(UNIDADES_TABLE)
      .select("*")
      .eq("empreendimento_id", empreendimentoId),
    empresaId
  ).order("fracao", { ascending: true });
}

export function insertUnidade(payload) {
  return supabase
    .from(UNIDADES_TABLE)
    .insert([payload])
    .select();
}

export function updateUnidade(unidadeId, payload, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from(UNIDADES_TABLE)
      .update(payload)
      .eq("id", unidadeId)
      .select(),
    empresaId
  );
}

export function deleteUnidade(unidadeId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from(UNIDADES_TABLE)
      .delete()
      .eq("id", unidadeId)
      .select(),
    empresaId
  );
}

export function fetchFicheirosByUnidadeId(unidadeId, empresaId = null) {
  if (!unidadeId) {
    return Promise.resolve({ data: [], error: null });
  }

  return applyEmpresaScope(
    supabase
      .from(FICHEIROS_TABLE)
      .select("*")
      .eq("entidade_tipo", "unidade")
      .eq("entidade_id", unidadeId),
    empresaId
  ).order("created_at", { ascending: false });
}

export function deleteUnidadeFicheiro(ficheiroId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from(FICHEIROS_TABLE)
      .delete()
      .eq("id", ficheiroId),
    empresaId
  );
}

export function deleteUnidadeFicheirosByUnidadeId(unidadeId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from(FICHEIROS_TABLE)
      .delete()
      .eq("entidade_tipo", "unidade")
      .eq("entidade_id", unidadeId),
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

export function uploadUnidadeStorageFile(nomeArquivo, file) {
  return supabase.storage
    .from(STORAGE_BUCKET)
    .upload(nomeArquivo, file);
}

export function getUnidadeStoragePublicUrl(path) {
  return supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);
}

export function insertUnidadeFicheiro(payload) {
  return supabase
    .from(FICHEIROS_TABLE)
    .insert([payload])
    .select();
}
