import {
  deleteDocumentoById,
  fetchDocumentos,
  getDocumentoPublicUrl,
  insertDocumento,
  uploadDocumentoStorage
} from "../repositories";
import { DOCUMENTOS_UPLOAD_RULES } from "../utils";

export function validarTipoUpload(file, acceptedMimeTypes = DOCUMENTOS_UPLOAD_RULES.acceptedMimeTypes) {
  if (!file) return false;
  if (!Array.isArray(acceptedMimeTypes) || acceptedMimeTypes.length === 0) return true;
  return acceptedMimeTypes.includes(file.type);
}

export function validarTamanhoUpload(file, maxSizeBytes = DOCUMENTOS_UPLOAD_RULES.maxSizeBytes) {
  if (!file) return false;
  if (!Number.isFinite(maxSizeBytes)) return true;
  return file.size <= maxSizeBytes;
}

export function validarPayloadDocumento(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, message: "Payload inválido." };
  }

  if (!payload.arquivo_url || !payload.arquivo_nome) {
    return { ok: false, message: "Payload inválido." };
  }

  return { ok: true };
}

export function validarUploadDocumento(file) {
  if (!file) {
    return { ok: false, message: "Selecione um PDF" };
  }

  if (!validarTipoUpload(file)) {
    return { ok: false, message: "Tipo de ficheiro inválido." };
  }

  if (!validarTamanhoUpload(file)) {
    return { ok: false, message: "Ficheiro excede o tamanho permitido." };
  }

  return { ok: true };
}

export function montarPayloadDocumento({ nome, categoria, descricao, file, publicUrl }) {
  return {
    nome,
    categoria,
    descricao,
    arquivo_url: publicUrl,
    arquivo_nome: file?.name || null
  };
}

export async function carregarDocumentosService() {
  return fetchDocumentos();
}

export async function uploadDocumentoService({ nome, categoria, descricao, file }) {
  const validacao = validarUploadDocumento(file);
  if (!validacao.ok) {
    return {
      data: null,
      error: { message: validacao.message }
    };
  }

  const nomeArquivo = `${Date.now()}-${file.name}`;

  const { data, error } = await uploadDocumentoStorage(nomeArquivo, file);
  if (error) {
    return { data: null, error };
  }

  const { data: publicUrl } = getDocumentoPublicUrl(data.path);

  const payload = montarPayloadDocumento({
    nome,
    categoria,
    descricao,
    file,
    publicUrl: publicUrl.publicUrl
  });

  const payloadValidation = validarPayloadDocumento(payload);
  if (!payloadValidation.ok) {
    return {
      data: null,
      error: { message: payloadValidation.message }
    };
  }

  const { data: insertData, error: insertError } = await insertDocumento(payload);

  return {
    data: insertData,
    error: insertError
  };
}

export async function apagarDocumentoService(documentoId) {
  return deleteDocumentoById(documentoId);
}
