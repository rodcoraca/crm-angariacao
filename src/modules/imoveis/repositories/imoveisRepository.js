import { supabase } from "../../../supabase";

const IMOVEIS_TABLE = "estoque_nao_publicitado";
const FICHEIROS_TABLE = "imovel_ficheiros";
const STORAGE_BUCKET = "crm-imoveis";

export function fetchImoveis() {
  return supabase
    .from(IMOVEIS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });
}

export function fetchFicheirosByImovelId(imovelId) {
  return supabase
    .from(FICHEIROS_TABLE)
    .select("*")
    .eq("imovel_id", imovelId)
    .order("created_at", { ascending: false });
}

export function updateImovel(imovelId, payload) {
  return supabase
    .from(IMOVEIS_TABLE)
    .update(payload)
    .eq("id", imovelId);
}

export function insertImovel(payload) {
  return supabase
    .from(IMOVEIS_TABLE)
    .insert([payload]);
}

export function deleteFicheiro(ficheiroId) {
  return supabase
    .from(FICHEIROS_TABLE)
    .delete()
    .eq("id", ficheiroId);
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
