import { supabase } from "../../../supabase";
import {
  buildMissingEmpresaError,
  hasEmpresaId,
  resolveEmpresaId,
  warnMissingEmpresaId
} from "../../../utils/empresaScope.js";
import {
  deleteEmpreendimentoFicheiro,
  fetchFicheirosByEmpreendimentoId,
  getEmpreendimentoStoragePublicUrl,
  insertEmpreendimentoFicheiro,
  removeStorageFiles,
  updateEmpreendimentoFicheiro,
  uploadEmpreendimentoStorageFile
} from "../repositories/empreendimentosRepository";

export const EMPREENDIMENTO_DOCUMENT_CATEGORIES = [
  "brochura",
  "planta",
  "mapa_acabamentos",
  "mapa_unidades",
  "tabela_precos",
  "documento_adicional"
];

export const EMPREENDIMENTO_DOCUMENT_LABELS = {
  brochura: "Brochura",
  planta: "Plantas",
  mapa_acabamentos: "Mapa de acabamentos",
  mapa_unidades: "Mapa das unidades",
  tabela_precos: "Tabela de preços",
  documento_adicional: "Documentos adicionais"
};

export function mapCategoriaEmpreendimentoLabel(categoria = "") {
  const key = String(categoria || "").trim().toLowerCase();
  return EMPREENDIMENTO_DOCUMENT_LABELS[key] || "Documento";
}

export function validarEmpreendimentoDocumentoCategoria(categoria = "") {
  return EMPREENDIMENTO_DOCUMENT_CATEGORIES.includes(String(categoria || "").trim().toLowerCase());
}

export function buildEmpreendimentoDocumentoPayload({ empresaId = null, empreendimentoId = null, categoria = "", fileName = "", mimeType = "", publicUrl = null } = {}) {
  const normalizedCategoria = String(categoria || "").trim().toLowerCase();

  return {
    empresa_id: empresaId,
    entidade_tipo: "empreendimento",
    entidade_id: empreendimentoId,
    nome: String(fileName || "").trim() || `${normalizedCategoria || "documento"}`,
    tipo: String(mimeType || "").includes("pdf") ? "pdf" : "imagem",
    tipo_documento: normalizedCategoria,
    url: publicUrl || null
  };
}

export function validarEmpreendimentoDocumentoTenant({ empresaId = null, empreendimentoId = null, empreendimento = null, ficheiro = null } = {}) {
  if (!empreendimentoId || !empresaId) {
    return "";
  }

  const empreendimentoEmpresaId = empreendimento?.empresa_id || null;
  if (empreendimentoEmpresaId && String(empreendimentoEmpresaId) !== String(empresaId)) {
    return "O empreendimento selecionado não pertence à empresa atual.";
  }

  if (ficheiro) {
    const ficheiroEmpresaId = ficheiro?.empresa_id || null;
    if (ficheiroEmpresaId && String(ficheiroEmpresaId) !== String(empresaId)) {
      return "O documento selecionado não pertence à empresa atual.";
    }

    if (String(ficheiro?.entidade_tipo || "") !== "empreendimento") {
      return "O documento selecionado não corresponde ao empreendimento atual.";
    }

    if (ficheiro?.entidade_id && String(ficheiro.entidade_id) !== String(empreendimentoId)) {
      return "O documento selecionado não corresponde ao empreendimento atual.";
    }
  }

  return "";
}

export function extractStoragePathFromUrl(url) {
  if (!url) return null;

  try {
    const pathname = new URL(url).pathname;
    const marker = "/object/public/crm-imoveis/";
    const index = pathname.toLowerCase().indexOf(marker.toLowerCase());
    if (index === -1) return null;
    return decodeURIComponent(pathname.slice(index + marker.length));
  } catch (error) {
    return null;
  }
}

export async function fetchEmpreendimentoDocumentosService(empreendimentoId, currentUser = null) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    return { data: [], error: null };
  }

  const { data: empreendimento, error: empreendimentoError } = await supabase
    .from("empreendimentos")
    .select("id, empresa_id, nome")
    .eq("id", empreendimentoId)
    .maybeSingle();

  if (empreendimentoError) {
    throw empreendimentoError;
  }

  if (!empreendimento || String(empreendimento.empresa_id || "") !== String(empresaId)) {
    return { data: [], error: new Error("O empreendimento selecionado não pertence à empresa atual.") };
  }

  return fetchFicheirosByEmpreendimentoId(empreendimentoId, empresaId);
}

export async function uploadEmpreendimentoDocumentoService({ file, empreendimentoId, categoria, currentUser = null }) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    throw buildMissingEmpresaError();
  }

  if (!file) {
    throw new Error("Selecione um ficheiro antes de carregar.");
  }

  if (!empreendimentoId) {
    throw new Error("Selecione um empreendimento válido antes de carregar o documento.");
  }

  const normalizedCategoria = String(categoria || "").trim().toLowerCase();
  if (!validarEmpreendimentoDocumentoCategoria(normalizedCategoria)) {
    throw new Error("Categoria de documento inválida.");
  }

  const { data: empreendimento, error: empreendimentoError } = await supabase
    .from("empreendimentos")
    .select("id, empresa_id, nome")
    .eq("id", empreendimentoId)
    .maybeSingle();

  if (empreendimentoError) {
    throw empreendimentoError;
  }

  const tenantError = validarEmpreendimentoDocumentoTenant({
    empresaId,
    empreendimentoId,
    empreendimento,
    ficheiro: null
  });

  if (tenantError) {
    throw new Error(tenantError);
  }

  const nomeArquivo = `${Date.now()}-${file.name}`;
  const { data: storageData, error: storageError } = await uploadEmpreendimentoStorageFile(nomeArquivo, file);
  if (storageError) {
    throw storageError;
  }

  const { data: publicUrlData } = getEmpreendimentoStoragePublicUrl(storageData.path);
  const payload = buildEmpreendimentoDocumentoPayload({
    empresaId,
    empreendimentoId,
    categoria: normalizedCategoria,
    fileName: file.name,
    mimeType: file.type,
    publicUrl: publicUrlData?.publicUrl || null
  });

  const { data, error } = await insertEmpreendimentoFicheiro(payload);
  if (error) {
    throw error;
  }

  return { data, error: null };
}

export async function replaceEmpreendimentoDocumentoService({ ficheiro, file, empreendimentoId, categoria, currentUser = null }) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    throw buildMissingEmpresaError();
  }

  if (!ficheiro?.id || !file) {
    throw new Error("Selecione um ficheiro válido para substituir.");
  }

  const { data: empreendimento, error: empreendimentoError } = await supabase
    .from("empreendimentos")
    .select("id, empresa_id, nome")
    .eq("id", empreendimentoId)
    .maybeSingle();

  if (empreendimentoError) {
    throw empreendimentoError;
  }

  const { data: ficheiroAtual, error: ficheiroError } = await supabase
    .from("imovel_ficheiros")
    .select("id, empresa_id, entidade_tipo, entidade_id, url, tipo_documento")
    .eq("id", ficheiro.id)
    .maybeSingle();

  if (ficheiroError) {
    throw ficheiroError;
  }

  const tenantError = validarEmpreendimentoDocumentoTenant({
    empresaId,
    empreendimentoId,
    empreendimento,
    ficheiro: ficheiroAtual
  });

  if (tenantError) {
    throw new Error(tenantError);
  }

  const normalizedCategoria = String(categoria || ficheiro?.tipo_documento || ficheiroAtual?.tipo_documento || "").trim().toLowerCase();
  if (!validarEmpreendimentoDocumentoCategoria(normalizedCategoria)) {
    throw new Error("Categoria de documento inválida.");
  }

  const nomeArquivo = `${Date.now()}-${file.name}`;
  const { data: storageData, error: storageError } = await uploadEmpreendimentoStorageFile(nomeArquivo, file);
  if (storageError) {
    throw storageError;
  }

  const { data: publicUrlData } = getEmpreendimentoStoragePublicUrl(storageData.path);
  const nextPayload = buildEmpreendimentoDocumentoPayload({
    empresaId,
    empreendimentoId,
    categoria: normalizedCategoria,
    fileName: file.name,
    mimeType: file.type,
    publicUrl: publicUrlData?.publicUrl || null
  });

  const { data: updatedData, error: updateError } = await updateEmpreendimentoFicheiro(ficheiro.id, nextPayload, empresaId);
  if (updateError) {
    throw updateError;
  }

  const oldPath = extractStoragePathFromUrl(ficheiroAtual?.url);
  if (oldPath) {
    const { error: removeError } = await removeStorageFiles([oldPath]);
    if (removeError) {
      throw removeError;
    }
  }

  return { data: updatedData, error: null };
}

export async function deleteEmpreendimentoDocumentoService({ ficheiro, currentUser = null }) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: buildMissingEmpresaError() };
  }

  if (!ficheiro?.id) {
    return { data: null, error: new Error("Ficheiro inválido.") };
  }

  const { data: ficheiroAtual, error: ficheiroError } = await supabase
    .from("imovel_ficheiros")
    .select("id, empresa_id, entidade_tipo, entidade_id, url")
    .eq("id", ficheiro.id)
    .maybeSingle();

  if (ficheiroError) {
    throw ficheiroError;
  }

  const tenantError = validarEmpreendimentoDocumentoTenant({
    empresaId,
    empreendimentoId: ficheiroAtual?.entidade_id || ficheiro?.entidade_id || null,
    empreendimento: { id: ficheiroAtual?.entidade_id || ficheiro?.entidade_id || null, empresa_id: empresaId },
    ficheiro: ficheiroAtual || ficheiro
  });

  if (tenantError) {
    throw new Error(tenantError);
  }

  const path = extractStoragePathFromUrl(ficheiroAtual?.url || ficheiro?.url);
  if (path) {
    const { error: storageError } = await removeStorageFiles([path]);
    if (storageError) {
      throw storageError;
    }
  }

  return deleteEmpreendimentoFicheiro(ficheiro.id, empresaId);
}
