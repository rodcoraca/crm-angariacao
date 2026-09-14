import {
  buildMissingEmpresaError,
  hasEmpresaId,
  resolveEmpresaId,
  warnMissingEmpresaId
} from "../../../utils/empresaScope.js";
import {
  deleteCondicaoPagamento,
  fetchCondicoesPagamentoByEmpreendimento,
  insertCondicaoPagamento,
  updateCondicaoPagamento
} from "../repositories/condicoesPagamentoRepository";

export function buildDefaultCondicoesPagamento() {
  return [
    {
      id: null,
      nome_etapa: "Entrada",
      ordem: 1,
      tipo_valor: "fixo",
      valor: "",
      negociavel: false,
      condicao_negociacao: "",
      isCustom: false
    },
    {
      id: null,
      nome_etapa: "CPCV",
      ordem: 2,
      tipo_valor: "percentual",
      valor: "",
      negociavel: false,
      condicao_negociacao: "",
      isCustom: false
    },
    {
      id: null,
      nome_etapa: "Escritura",
      ordem: 3,
      tipo_valor: "percentual",
      valor: "",
      negociavel: false,
      condicao_negociacao: "",
      isCustom: false
    }
  ];
}

export function mapCondicaoPagamentoParaFormulario(condicao = {}) {
  return {
    id: condicao?.id || null,
    nome_etapa: condicao?.nome_etapa || "",
    ordem: Number(condicao?.ordem || 1),
    tipo_valor: condicao?.tipo_valor === "percentual" ? "percentual" : "fixo",
    valor: condicao?.valor === null || condicao?.valor === undefined || condicao?.valor === "" ? "" : String(condicao.valor),
    negociavel: Boolean(condicao?.negociavel),
    condicao_negociacao: condicao?.condicao_negociacao || "",
    isCustom: !["Entrada", "CPCV", "Escritura"].includes(String(condicao?.nome_etapa || ""))
  };
}

export function normalizeCondicaoPagamentoValue(rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return null;
  }

  const plainValue = String(rawValue).replace(/€/g, "").replace(/%/g, "").replace(/\s+/g, "").replace(",", ".").trim();
  if (!plainValue) return null;

  const numericValue = Number(plainValue);
  return Number.isNaN(numericValue) ? null : numericValue;
}

export function toCondicaoPagamentoPayload(condicao = {}, { empreendimentoId } = {}) {
  const valorNumerico = normalizeCondicaoPagamentoValue(condicao.valor);
  const tipo = condicao.tipo_valor === "percentual" ? "percentual" : "fixo";

  return {
    empreendimento_id: empreendimentoId || null,
    nome_etapa: String(condicao.nome_etapa || "").trim(),
    ordem: Number(condicao.ordem || 1),
    tipo_valor: tipo,
    valor: valorNumerico,
    negociavel: Boolean(condicao.negociavel),
    condicao_negociacao: Boolean(condicao.negociavel) ? String(condicao.condicao_negociacao || "").trim() || null : null
  };
}

export function validarCondicaoPagamento(condicao = {}) {
  if (!String(condicao.nome_etapa || "").trim()) {
    return "O nome da etapa é obrigatório.";
  }

  if (!condicao.tipo_valor || !["fixo", "percentual"].includes(condicao.tipo_valor)) {
    return "O tipo de valor é obrigatório.";
  }

  const valorNumerico = normalizeCondicaoPagamentoValue(condicao.valor);
  if (valorNumerico === null || Number.isNaN(valorNumerico)) {
    return "O valor da etapa é obrigatório e numérico.";
  }

  if (condicao.tipo_valor === "percentual") {
    if (valorNumerico <= 0 || valorNumerico > 100) {
      return "O percentual deve estar entre 0 e 100.";
    }
  }

  if (condicao.tipo_valor === "fixo" && valorNumerico < 0) {
    return "O valor fixo não pode ser negativo.";
  }

  return "";
}

export async function fetchCondicoesPagamentoService(empreendimentoId) {
  const empresaId = await resolveEmpresaId();
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  return fetchCondicoesPagamentoByEmpreendimento(empreendimentoId, empresaId);
}

export async function salvarCondicoesPagamentoService({ empreendimentoId, condicoes = [], currentUser = null }) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: buildMissingEmpresaError() };
  }

  const results = [];

  for (const condicao of condicoes) {
    const payload = toCondicaoPagamentoPayload(condicao, { empreendimentoId });
    const validationError = validarCondicaoPagamento(condicao);
    if (validationError) {
      return { data: null, error: new Error(validationError) };
    }

    if (condicao.id) {
      const response = await updateCondicaoPagamento(condicao.id, payload, empresaId);
      if (response.error) {
        return response;
      }
      results.push(response.data?.[0] || response.data || null);
    } else {
      const response = await insertCondicaoPagamento({ ...payload, empreendimento_id: empreendimentoId });
      if (response.error) {
        return response;
      }
      results.push(response.data?.[0] || response.data || null);
    }
  }

  return { data: results.filter(Boolean), error: null };
}

export async function excluirCondicaoPagamentoService({ condicaoId, currentUser = null }) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: null, error: buildMissingEmpresaError() };
  }

  return deleteCondicaoPagamento(condicaoId, empresaId);
}
