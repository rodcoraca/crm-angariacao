import { supabase } from "../../../supabase";
import { applyEmpresaScope } from "../../../utils/empresaScope.js";

const IMOVEIS_TABLE = "estoque_nao_publicitado";
const FICHEIROS_TABLE = "imovel_ficheiros";
const STORAGE_BUCKET = "crm-imoveis";

export function fetchImoveis(empresaId = null) {
  return applyEmpresaScope(supabase
    .from(IMOVEIS_TABLE)
    .select("*"), empresaId)
    .order("created_at", { ascending: false });
}

export function fetchFicheirosByImovelId(imovelId, empresaId = null) {
  return applyEmpresaScope(supabase
    .from(FICHEIROS_TABLE)
    .select("*")
    .eq("imovel_id", imovelId), empresaId)
    .order("created_at", { ascending: false });
}

export function updateImovel(imovelId, payload, empresaId = null) {
  return applyEmpresaScope(supabase
    .from(IMOVEIS_TABLE)
    .update(payload)
    .eq("id", imovelId), empresaId);
}

export function insertImovel(payload) {
  return supabase
    .from(IMOVEIS_TABLE)
    .insert([payload]);
}

export function deleteFicheiro(ficheiroId, empresaId = null) {
  return applyEmpresaScope(supabase
    .from(FICHEIROS_TABLE)
    .delete()
    .eq("id", ficheiroId), empresaId);
}

export function uploadImovelStorageFile(nomeArquivo, file) {
  return supabase.storage
    .from(STORAGE_BUCKET)
    .upload(nomeArquivo, file);
}

export function getImovelStoragePublicUrl(path) {
  return supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);
}

export function insertImovelFicheiro(payload) {
  return supabase
    .from(FICHEIROS_TABLE)
    .insert([payload])
    .select();
}
