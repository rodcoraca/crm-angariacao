import { supabase } from "../../../supabase";
import {
  buildMissingEmpresaError,
  hasEmpresaId,
  resolveEmpresaId,
  warnMissingEmpresaId
} from "../../../utils/empresaScope.js";
import {
  deleteUnidade,
  deleteUnidadeFicheirosByUnidadeId,
  fetchFicheirosByUnidadeId,
  fetchUnidadesByEmpreendimento,
  insertUnidade,
  insertUnidadeFicheiro,
  removeStorageFiles,
  updateUnidade,
  uploadUnidadeStorageFile,
  getUnidadeStoragePublicUrl,
  deleteUnidadeFicheiro
} from "../repositories/unidadesRepository";

export function buildDefaultUnidadeForm() {
  return {
    fracao: "",
    tipologia: "",
    area_bruta_privativa: "",
    area_total: "",
    area_dependente: "",
    varanda: false,
    terraco: false,
    lugares_garagem: "",
    planta: null
  };
}

export function inferNextFracao(fracao = "") {
  const safeFracao = String(fracao || "").trim();

  if (!safeFracao) {
    return "";
  }

  const directLetterMatch = safeFracao.match(/^([A-Z])$/i);
  if (directLetterMatch) {
    return String.fromCharCode(safeFracao.charCodeAt(0) + 1);
  }

  const numericalLetterMatch = safeFracao.match(/^([0-9]+)([A-Z])$/i);
  if (numericalLetterMatch) {
    return `${numericalLetterMatch[1]}${String.fromCharCode(numericalLetterMatch[2].charCodeAt(0) + 1)}`;
  }

  return "";
}

export function mapUnidadeParaFormulario(unidade = {}) {
  return {
    fracao: unidade?.fracao || "",
    tipologia: unidade?.tipologia || "",
    area_bruta_privativa: unidade?.area_bruta_privativa ?? "",
    area_total: unidade?.area_total ?? "",
    area_dependente: unidade?.area_dependente ?? "",
    varanda: Boolean(unidade?.varanda),
    terraco: Boolean(unidade?.terraco),
    lugares_garagem: unidade?.lugares_garagem ?? "",
    planta: null
  };
}

export function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const normalized = Number(value);
  return Number.isNaN(normalized) ? null : normalized;
}

export function validarFracaoDuplicada({ fracao = "", empreendimentoId = null, unidades = [], unidadeId = null } = {}) {
  const normalizedFracao = String(fracao || "").trim();
  if (!normalizedFracao || !empreendimentoId) {
    return "";
  }

  const duplicate = (unidades || []).find((unidade) => {
    if (unidadeId && String(unidade?.id || "") === String(unidadeId)) {
      return false;
    }

    return String(unidade?.empreendimento_id || "") === String(empreendimentoId)
      && String(unidade?.fracao || "").trim().toLowerCase() === normalizedFracao.toLowerCase();
  });

  return duplicate ? "Já existe uma unidade com esta fração no empreendimento." : "";
}

export function validarEmpreendimentoTenant({ empreendimentoId = null, empresaId = null, empreendimento = null } = {}) {
  if (!empreendimentoId || !empresaId) {
    return "";
  }

  const empreendimentoEmpresaId = empreendimento?.empresa_id || null;
  if (empreendimentoEmpresaId && String(empreendimentoEmpresaId) !== String(empresaId)) {
    return "O empreendimento selecionado não pertence à empresa atual.";
  }

  return "";
}

export function validarUnidade(form = {}) {
  if (!String(form.fracao || "").trim()) {
    return "A fração e a tipologia são obrigatórias.";
  }

  if (!String(form.tipologia || "").trim()) {
    return "A fração e a tipologia são obrigatórias.";
  }

  const areaFieldNames = [
    "area_bruta_privativa",
    "area_total",
    "area_dependente"
  ];

  const hasInvalidNumericArea = areaFieldNames.some((field) => {
    const value = form[field];
    if (value === "" || value === null || value === undefined) return false;
    const numericValue = Number(value);
    return Number.isNaN(numericValue) || numericValue < 0;
  });

  if (hasInvalidNumericArea) {
    return "As áreas devem ser numéricas e não negativas.";
  }

  const garageValue = form.lugares_garagem;
  if (garageValue !== "" && garageValue !== null && garageValue !== undefined) {
    const numericGarage = Number(garageValue);
    if (Number.isNaN(numericGarage) || numericGarage < 1 || numericGarage > 6) {
      return "A garagem deve estar entre 1 e 6.";
    }
  }

  return "";
}

export function toUnidadePayload(form = {}, { empresaId, empreendimentoId, userProfileId, isEditing = false } = {}) {
  const payload = {
    empresa_id: empresaId,
    empreendimento_id: empreendimentoId || form.empreendimento_id || null,
    fracao: String(form.fracao || "").trim() || null,
    tipologia: String(form.tipologia || "").trim() || null,
    area_bruta_privativa: toNumberOrNull(form.area_bruta_privativa),
    area_total: toNumberOrNull(form.area_total),
    area_dependente: toNumberOrNull(form.area_dependente),
    varanda: Boolean(form.varanda),
    terraco: Boolean(form.terraco),
    lugares_garagem: toNumberOrNull(form.lugares_garagem)
  };

  if (!isEditing) {
    payload.created_by = userProfileId || null;
  }

  payload.updated_by = userProfileId || null;
  return payload;
}

export async function fetchUnidadesService(empreendimentoId, currentUser = null) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    return { data: [], error: null };
  }

  const { data: unidades = [], error } = await fetchUnidadesByEmpreendimento(empreendimentoId, empresaId);
  if (error) {
    return { data: [], error };
  }

  const unidadesComPlanta = await Promise.all((unidades || []).map(async (unidade) => {
    const { data: ficheiros = [] } = await fetchFicheirosByUnidadeId(unidade.id, empresaId);
    const planta = (ficheiros || []).find((ficheiro) => String(ficheiro?.tipo_documento || "").toLowerCase() === "planta") || (ficheiros || [])[0] || null;

    return {
      ...unidade,
      ficheiros: ficheiros || [],
      planta
    };
  }));

  return { data: unidadesComPlanta, error: null };
}

export function buildPlantaUnidadePayload({ empresaId = null, unidadeId = null, fileName = "", mimeType = "" } = {}) {
  const normalizedName = String(fileName || "").trim();
  const normalizedType = String(mimeType || "").toLowerCase();

  return {
    empresa_id: empresaId,
    entidade_tipo: "unidade",
    entidade_id: unidadeId,
    nome: normalizedName || "planta",
    tipo: normalizedType.includes("pdf") ? "pdf" : "imagem",
    tipo_documento: "planta",
    url: null
  };
}

export async function salvarUnidadeService({ form, empreendimentoId, isEditing = false, unidadeEdicao = null, currentUser = null }) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: buildMissingEmpresaError() };
  }

  const normalizedEmpreendimentoId = empreendimentoId || unidadeEdicao?.empreendimento_id || form.empreendimento_id || null;
  const { data: empreendimento, error: empreendimentoError } = await supabase
    .from("empreendimentos")
    .select("id, empresa_id")
    .eq("id", normalizedEmpreendimentoId)
    .maybeSingle();

  if (empreendimentoError) {
    throw empreendimentoError;
  }

  const tenantError = validarEmpreendimentoTenant({
    empreendimentoId: normalizedEmpreendimentoId,
    empresaId,
    empreendimento
  });

  if (tenantError) {
    throw new Error(tenantError);
  }

  const normalizedFracao = String(form?.fracao || "").trim();
  if (normalizedFracao) {
    const { data: unidadesExistentes = [], error: duplicateError } = await supabase
      .from("unidades")
      .select("id, empreendimento_id, fracao")
      .eq("empreendimento_id", normalizedEmpreendimentoId)
      .ilike("fracao", normalizedFracao);

    if (duplicateError) {
      throw duplicateError;
    }

    const sameFracaoExists = (unidadesExistentes || []).some((unidade) => {
      if (String(unidade?.id || "") === String(unidadeEdicao?.id || "")) {
        return false;
      }

      return String(unidade?.fracao || "").trim().toLowerCase() === normalizedFracao.toLowerCase();
    });

    if (sameFracaoExists) {
      throw new Error("Já existe uma unidade com esta fração no empreendimento.");
    }
  }

  const userProfileId = currentUser?.perfil_id || currentUser?.id || null;
  const payload = toUnidadePayload(form, {
    empresaId,
    empreendimentoId: normalizedEmpreendimentoId,
    userProfileId,
    isEditing
  });

  if (isEditing && unidadeEdicao?.id) {
    return updateUnidade(unidadeEdicao.id, payload, empresaId);
  }

  return insertUnidade(payload);
}

export async function excluirUnidadeService({ unidadeId, currentUser = null }) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: buildMissingEmpresaError() };
  }

  const { data: ficheiros = [] } = await fetchFicheirosByUnidadeId(unidadeId, empresaId);

  const paths = (ficheiros || [])
    .map((ficheiro) => extractStoragePathFromUrl(ficheiro?.url))
    .filter(Boolean);

  if (paths.length > 0) {
    const { error: storageError } = await removeStorageFiles(paths);
    if (storageError) {
      throw storageError;
    }
  }

  const { error: ficheirosError } = await deleteUnidadeFicheirosByUnidadeId(unidadeId, empresaId);
  if (ficheirosError) {
    throw ficheirosError;
  }

  return deleteUnidade(unidadeId, empresaId);
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

export function mapFicheiroParaAuditoria(ficheiro = {}) {
  return {
    id: ficheiro.id ?? null,
    nome: ficheiro.nome ?? null,
    caminho: extractStoragePathFromUrl(ficheiro.url) || ficheiro.url || null,
    tipo: ficheiro.tipo ?? null
  };
}

export async function validarUnidadePertenceEmpresa(unidadeId, empresaId = null) {
  if (!unidadeId || !empresaId) {
    return null;
  }

  const { data, error } = await supabase
    .from("unidades")
    .select("id, empresa_id, empreendimento_id")
    .eq("id", unidadeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || String(data.empresa_id || "") !== String(empresaId)) {
    throw new Error("A planta só pode ser associada a uma unidade da empresa atual.");
  }

  return data;
}

export async function uploadPlantaUnidadeService({ file, unidadeId, setProgresso, currentUser = null }) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    throw buildMissingEmpresaError();
  }

  if (!file || !unidadeId) {
    throw new Error("Selecione uma unidade e um ficheiro antes de carregar a planta.");
  }

  await validarUnidadePertenceEmpresa(unidadeId, empresaId);

  const nomeArquivo = `${Date.now()}-${file.name}`;
  setProgresso?.(30);

  const { data, error } = await uploadUnidadeStorageFile(nomeArquivo, file);
  if (error) throw error;

  setProgresso?.(70);

  const { data: publicUrl } = getUnidadeStoragePublicUrl(data.path);

  const { data: insertData, error: insertError } = await insertUnidadeFicheiro({
    empresa_id: empresaId,
    entidade_tipo: "unidade",
    entidade_id: unidadeId,
    nome: file.name,
    tipo: file.type?.includes("pdf") ? "pdf" : "imagem",
    tipo_documento: "planta",
    url: publicUrl.publicUrl
  });

  return { insertData, insertError };
}

export async function deletePlantaUnidadeService({ ficheiro, currentUser = null }) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: buildMissingEmpresaError() };
  }

  if (!ficheiro?.id) {
    return { data: null, error: new Error("Ficheiro inválido.") };
  }

  const { data: ficheiroAtual } = await supabase
    .from("imovel_ficheiros")
    .select("id, empresa_id, entidade_tipo, entidade_id")
    .eq("id", ficheiro.id)
    .maybeSingle();

  if (!ficheiroAtual || String(ficheiroAtual.empresa_id || "") !== String(empresaId)) {
    return { data: null, error: new Error("A planta selecionada não pertence à empresa atual.") };
  }

  const path = extractStoragePathFromUrl(ficheiro.url);
  if (path) {
    const { error: storageError } = await removeStorageFiles([path]);
    if (storageError) {
      throw storageError;
    }
  }

  return deleteUnidadeFicheiro(ficheiro.id, empresaId);
}
