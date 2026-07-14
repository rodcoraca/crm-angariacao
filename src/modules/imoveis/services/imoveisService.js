import { normalizarTelefone, validarTelefone } from "../../../telefone";
import {
  fetchFicheirosByImovelId,
  fetchImoveis,
  getImovelStoragePublicUrl,
  insertImovel,
  insertImovelFicheiro,
  updateImovel,
  uploadImovelStorageFile,
  deleteFicheiro
} from "../repositories";
import { FORM_DEFAULTS, TELEFONE_ERROR_MESSAGE } from "../utils";
import {
  buildMissingEmpresaError,
  hasEmpresaId,
  resolveEmpresaId,
  warnMissingEmpresaId
} from "../../../utils/empresaScope.js";

export async function carregarImoveisService() {
  const empresaId = await resolveEmpresaId();
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  return fetchImoveis(empresaId);
}

export async function carregarFicheirosService(imovelId) {
  const empresaId = await resolveEmpresaId();
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  return fetchFicheirosByImovelId(imovelId, empresaId);
}

export function mapImovelParaFormulario(imovel) {
  const telefoneNormalizado = normalizarTelefone(imovel?.telefone || "");

  return {
    proprietario: imovel?.proprietario || "",
    telefone: telefoneNormalizado,
    telefoneErro:
      telefoneNormalizado && !validarTelefone(telefoneNormalizado)
        ? TELEFONE_ERROR_MESSAGE
        : "",
    tipologia: imovel?.tipologia || "",
    zona: imovel?.zona || "",
    valorPretendido: imovel?.valor_pretendido || "",
    valorVenda: imovel?.valor_venda || "",
    valorM2: imovel?.valor_m2 || "",
    areaBrutaPrivativa: imovel?.area_bruta_privativa || "",
    areaUtil: imovel?.area_util || "",
    numeroQuartos: imovel?.numero_quartos || "",
    casasBanho: imovel?.casas_banho || "",
    precoCondominio: imovel?.preco_condominio || "",
    email: imovel?.email || "",
    codigoPostal: imovel?.codigo_postal || "",
    morada: imovel?.morada || "",
    distrito: imovel?.distrito || "",
    concelho: imovel?.concelho || "",
    freguesia: imovel?.freguesia || "",
    observacoes: imovel?.observacoes || "",
    estacionamento:
      imovel?.estacionamento === false ||
      imovel?.estacionamento === null ||
      imovel?.estacionamento === undefined
        ? ""
        : String(imovel?.estacionamento),
    cmi: Boolean(imovel?.cmi),
    cadernetaPredial: Boolean(imovel?.caderneta_predial),
    plantas: Boolean(imovel?.plantas),
    certificadoEnergetico: Boolean(imovel?.certificado_energetico),
    cartaoCidadao: Boolean(imovel?.cartao_cidadao)
  };
}

export function buildDefaultFormulario() {
  return { ...FORM_DEFAULTS };
}

export function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function validarTelefoneFormulario(telefone) {
  const telefoneNormalizado = normalizarTelefone(telefone);

  if (!telefoneNormalizado) {
    return { telefone: "", erro: "" };
  }

  return {
    telefone: telefoneNormalizado,
    erro: validarTelefone(telefoneNormalizado) ? "" : TELEFONE_ERROR_MESSAGE
  };
}

export function calcularValorM2(valorVenda, areaBrutaPrivativa) {
  if (
    valorVenda &&
    areaBrutaPrivativa &&
    Number(areaBrutaPrivativa) > 0
  ) {
    return (
      Number(valorVenda) /
      Number(areaBrutaPrivativa)
    ).toFixed(2);
  }

  return null;
}

export function construirPayloadImovel(form) {
  return {
    proprietario: form.proprietario,
    telefone: form.telefone,
    tipologia: form.tipologia,
    zona: form.zona,
    valor_pretendido: toNumberOrNull(form.valorPretendido),
    valor_venda: toNumberOrNull(form.valorVenda),
    valor_m2: toNumberOrNull(form.valorM2),
    area_bruta_privativa: toNumberOrNull(form.areaBrutaPrivativa),
    area_util: toNumberOrNull(form.areaUtil),
    numero_quartos: toNumberOrNull(form.numeroQuartos),
    casas_banho: toNumberOrNull(form.casasBanho),
    preco_condominio: toNumberOrNull(form.precoCondominio),
    email: form.email || null,
    codigo_postal: form.codigoPostal || null,
    morada: form.morada || null,
    distrito: form.distrito || null,
    concelho: form.concelho || null,
    freguesia: form.freguesia || null,
    observacoes: form.observacoes || null,
    estacionamento: toNumberOrNull(form.estacionamento),
    cmi: form.cmi,
    caderneta_predial: form.cadernetaPredial,
    plantas: form.plantas,
    certificado_energetico: form.certificadoEnergetico,
    cartao_cidadao: form.cartaoCidadao
  };
}

export async function salvarImovelService({ form, isEditing, imovelEdicao }) {
  const empresaId = await resolveEmpresaId();
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: buildMissingEmpresaError() };
  }

  const payload = construirPayloadImovel(form);
  payload.empresa_id = empresaId;

  if (isEditing && imovelEdicao) {
    return updateImovel(imovelEdicao.id, payload, empresaId);
  }

  return insertImovel(payload);
}

export async function apagarFicheiroService(ficheiroId) {
  const empresaId = await resolveEmpresaId();
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: buildMissingEmpresaError() };
  }

  return deleteFicheiro(ficheiroId, empresaId);
}

export async function uploadFicheiroService({ file, imovelId, setProgresso }) {
  const empresaId = await resolveEmpresaId();
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    throw buildMissingEmpresaError();
  }

  const nomeArquivo = `${Date.now()}-${file.name}`;

  setProgresso(30);

  const { data, error } = await uploadImovelStorageFile(nomeArquivo, file);
  if (error) throw error;

  setProgresso(70);

  const { data: publicUrl } = getImovelStoragePublicUrl(data.path);

  const { data: insertData, error: insertError } = await insertImovelFicheiro({
    imovel_id: imovelId,
    empresa_id: empresaId,
    nome: file.name,
    tipo: file.type.includes("pdf") ? "pdf" : "imagem",
    url: publicUrl.publicUrl
  });

  return {
    insertData,
    insertError
  };
}

export async function downloadFicheiroService(ficheiro) {
  const response = await fetch(ficheiro.url);
  const blob = await response.blob();

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = ficheiro.nome;

  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}
