import { supabase } from "../../../supabase";
import { applyEmpresaScope } from "../../../utils/empresaScope";
import { DOCUMENTOS_STORAGE_BUCKET, DOCUMENTOS_TABLE } from "../utils";

export function fetchDocumentos(empresaId = null) {
  return applyEmpresaScope(supabase
    .from(DOCUMENTOS_TABLE)
    .select("*"), empresaId)
    .order("created_at", { ascending: false });
}

export function uploadDocumentoStorage(nomeArquivo, file) {
  return supabase.storage
    .from(DOCUMENTOS_STORAGE_BUCKET)
    .upload(nomeArquivo, file);
}

export function getDocumentoPublicUrl(path) {
  return supabase.storage
    .from(DOCUMENTOS_STORAGE_BUCKET)
    .getPublicUrl(path);
}

export function insertDocumento(payload) {
  return supabase
    .from(DOCUMENTOS_TABLE)
    .insert([payload]);
}

export function deleteDocumentoById(documentoId, empresaId = null) {
  return applyEmpresaScope(supabase
    .from(DOCUMENTOS_TABLE)
    .delete()
    .eq("id", documentoId), empresaId);
}
