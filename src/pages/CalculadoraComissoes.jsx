import { useEffect, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";

export function toNumber(value) {
  if (value === null || value === undefined || value === "") return NaN;
  const normalized = String(value)
    .trim()
    .replace(/€/g, "")
    .replace(/%/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function roundMoney(value) {
  return Number(Math.abs(Number(value || 0)).toFixed(2));
}

export function roundPercent(value) {
  return Number(Math.abs(Number(value || 0)).toFixed(2));
}

export function formatMoneyDisplay(value) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = toNumber(value);
  if (Number.isNaN(numeric)) return "";
  return `${new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numeric)} €`;
}

export function formatPercentDisplay(value) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = toNumber(value);
  if (Number.isNaN(numeric)) return "";
  return `${new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numeric)} %`;
}

export function normalizeMoneyInput(value) {
  if (value === null || value === undefined) return "";
  const sanitized = String(value).replace(/[^\d,.-]/g, "");
  if (sanitized === "") return "";

  if (sanitized.includes(",") && sanitized.includes(".")) {
    const lastComma = sanitized.lastIndexOf(",");
    const lastDot = sanitized.lastIndexOf(".");
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const groupingSeparator = decimalSeparator === "," ? "." : ",";
    return sanitized
      .replace(new RegExp(`\\${groupingSeparator}`, "g"), "")
      .replace(decimalSeparator, ".");
  }

  if (sanitized.includes(",")) return sanitized.replace(",", ".");
  return sanitized;
}

export function normalizePercentInput(value) {
  if (value === null || value === undefined) return "";
  const sanitized = String(value).replace(/[^\d,.-]/g, "");
  if (sanitized === "") return "";

  if (sanitized.includes(",") && sanitized.includes(".")) {
    const lastComma = sanitized.lastIndexOf(",");
    const lastDot = sanitized.lastIndexOf(".");
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const groupingSeparator = decimalSeparator === "," ? "." : ",";
    return sanitized
      .replace(new RegExp(`\\${groupingSeparator}`, "g"), "")
      .replace(decimalSeparator, ".");
  }

  if (sanitized.includes(",")) return sanitized.replace(",", ".");
  return sanitized;
}

export function formatMoneyInput(value) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = toNumber(value);
  if (Number.isNaN(numeric)) return "";
  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  }).format(numeric) + " €";
}

export function formatPercentInput(value) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = toNumber(value);
  if (Number.isNaN(numeric)) return "";
  return `${new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  }).format(numeric)} %`;
}

export function calcularPercentual({ venda, percentual, iva, modoIva = "acresce" }) {
  const valorVenda = toNumber(venda);
  const percentualComissao = toNumber(percentual);
  const taxaIva = toNumber(iva);

  if ([valorVenda, percentualComissao, taxaIva].some((n) => Number.isNaN(n)) || valorVenda < 0 || percentualComissao < 0 || taxaIva < 0) {
    return null;
  }

  const comissaoSemIva = (valorVenda * percentualComissao) / 100;

  if (modoIva === "inclui") {
    const comissaoComIva = comissaoSemIva * (1 + taxaIva / 100);
    const ivaValor = comissaoComIva - comissaoSemIva;
    return {
      comissaoSemIva: roundMoney(comissaoSemIva),
      iva: roundMoney(ivaValor),
      comissaoComIva: roundMoney(comissaoComIva),
      valorVenda: roundMoney(valorVenda),
      liquidoVendedor: roundMoney(valorVenda - comissaoComIva)
    };
  }

  const ivaValor = comissaoSemIva * (taxaIva / 100);
  const comissaoComIva = comissaoSemIva + ivaValor;
  return {
    comissaoSemIva: roundMoney(comissaoSemIva),
    iva: roundMoney(ivaValor),
    comissaoComIva: roundMoney(comissaoComIva),
    valorVenda: roundMoney(valorVenda),
    liquidoVendedor: roundMoney(valorVenda - comissaoComIva)
  };
}

export function calcularNegociacaoValor({
  valorVendaOriginal,
  percentualOriginal,
  novoValorVenda,
  novaComissao,
  comissaoIncluiIva = false,
  iva
}) {
  const valorOriginal = toNumber(valorVendaOriginal);
  const percentualBase = toNumber(percentualOriginal);
  const novoValor = toNumber(novoValorVenda);
  const comissaoInformada = toNumber(novaComissao);
  const taxaIva = toNumber(iva);

  if ([valorOriginal, percentualBase, novoValor, comissaoInformada, taxaIva].some((n) => Number.isNaN(n)) || valorOriginal < 0 || percentualBase < 0 || novoValor < 0 || comissaoInformada < 0 || taxaIva < 0) {
    return null;
  }

  let comissaoSemIva = comissaoInformada;
  let ivaValor = 0;
  let comissaoComIva = comissaoInformada;

  if (comissaoIncluiIva) {
    comissaoSemIva = comissaoInformada / (1 + taxaIva / 100);
    ivaValor = comissaoInformada - comissaoSemIva;
    comissaoComIva = comissaoInformada;
  } else {
    ivaValor = comissaoInformada * (taxaIva / 100);
    comissaoComIva = comissaoInformada + ivaValor;
  }

  const percentualEfetivo = (comissaoSemIva / novoValor) * 100;
  const comissaoPelaPercentualOriginal = (novoValor * percentualBase) / 100;
  const reducaoAdicional = comissaoPelaPercentualOriginal - comissaoSemIva;
  const liquidoVendedor = novoValor - comissaoComIva;

  return {
    comissaoSemIva: roundMoney(comissaoSemIva),
    iva: roundMoney(ivaValor),
    comissaoComIva: roundMoney(comissaoComIva),
    percentualEfetivo: roundPercent(percentualEfetivo),
    comissaoPelaPercentualOriginal: roundMoney(comissaoPelaPercentualOriginal),
    reducaoAdicional: roundMoney(reducaoAdicional),
    liquidoVendedor: roundMoney(liquidoVendedor)
  };
}

export function calcularMinimoVendedorPorPreco({ minimoVendedor, valorVenda, iva }) {
  const minimo = toNumber(minimoVendedor);
  const venda = toNumber(valorVenda);
  const taxaIva = toNumber(iva);

  if ([minimo, venda, taxaIva].some((n) => Number.isNaN(n)) || minimo < 0 || venda < 0 || taxaIva < 0) {
    return null;
  }

  const comissaoComIva = venda - minimo;
  const comissaoSemIva = comissaoComIva / (1 + taxaIva / 100);
  const ivaValor = comissaoComIva - comissaoSemIva;
  const percentualEfetivo = (comissaoSemIva / venda) * 100;

  return {
    comissaoComIva: roundMoney(comissaoComIva),
    comissaoSemIva: roundMoney(comissaoSemIva),
    iva: roundMoney(ivaValor),
    percentualEfetivo: roundPercent(percentualEfetivo)
  };
}

export function calcularMinimoVendedorPorComissao({ minimoVendedor, comissaoPretendida, iva }) {
  const minimo = toNumber(minimoVendedor);
  const comissao = toNumber(comissaoPretendida);
  const taxaIva = toNumber(iva);

  if ([minimo, comissao, taxaIva].some((n) => Number.isNaN(n)) || minimo < 0 || comissao < 0 || taxaIva < 0) {
    return null;
  }

  const ivaValor = comissao * (taxaIva / 100);
  const comissaoComIva = comissao + ivaValor;
  const valorVendaNecessario = minimo + comissaoComIva;
  const percentualPretendida = (comissao / valorVendaNecessario) * 100;

  return {
    percentualPretendida: roundPercent(percentualPretendida),
    iva: roundMoney(ivaValor),
    comissaoComIva: roundMoney(comissaoComIva),
    valorVendaNecessario: roundMoney(valorVendaNecessario)
  };
}

const MODELS = [
  { key: "percentual", label: "Comissão por Percentagem" },
  { key: "negociacao", label: "Negociação por Valor Absoluto" },
  { key: "minimo", label: "Mínimo do Vendedor" }
];

const defaultForm = {
  venda: "",
  percentual: "",
  iva: "",
  modoIva: "acresce",
  valorVendaOriginal: "",
  percentualOriginal: "",
  novoValorVenda: "",
  novaComissao: "",
  comissaoIncluiIva: "false",
  valorLiquidoMinimo: "",
  valorVendaProposto: "",
  comissaoPretendida: "",
  modoMinimo: "preco"
};

const emptyErrorState = {};

function getModelDefaults(modelKey) {
  const base = { ...defaultForm };
  if (modelKey === "percentual") {
    return {
      venda: "",
      percentual: "",
      iva: "",
      modoIva: "acresce"
    };
  }

  if (modelKey === "negociacao") {
    return {
      valorVendaOriginal: "",
      percentualOriginal: "",
      novoValorVenda: "",
      novaComissao: "",
      comissaoIncluiIva: "false",
      iva: ""
    };
  }

  return {
    valorLiquidoMinimo: "",
    iva: "",
    modoMinimo: "preco",
    valorVendaProposto: "",
    comissaoPretendida: ""
  };
}

export default function CalculadoraComissoes() {
  const theme = useTheme();
  const resultSectionRef = useRef(null);
  const [modelo, setModelo] = useState("percentual");
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState(emptyErrorState);
  const [resultado, setResultado] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 180);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function handleClear() {
    setResultado(null);
    setErrors({});
    setForm((prev) => ({ ...prev, ...getModelDefaults(modelo) }));
  }

  function validatePercentual() {
    const nextErrors = {};
    if (!form.venda || Number(form.venda) <= 0) nextErrors.venda = "Valor de venda obrigatório.";
    if (!form.percentual || Number(form.percentual) < 0 || Number(form.percentual) > 100) nextErrors.percentual = "Percentagem inválida.";
    if (!form.iva || Number(form.iva) < 0 || Number(form.iva) > 100) nextErrors.iva = "Taxa de IVA inválida.";
    return nextErrors;
  }

  function validateNegociacao() {
    const nextErrors = {};
    if (!form.valorVendaOriginal || Number(form.valorVendaOriginal) <= 0) nextErrors.valorVendaOriginal = "Valor original obrigatório.";
    if (!form.percentualOriginal || Number(form.percentualOriginal) < 0 || Number(form.percentualOriginal) > 100) nextErrors.percentualOriginal = "Percentagem original inválida.";
    if (!form.novoValorVenda || Number(form.novoValorVenda) <= 0) nextErrors.novoValorVenda = "Novo valor de venda obrigatório.";
    if (!form.novaComissao || Number(form.novaComissao) < 0) nextErrors.novaComissao = "Comissão negociada inválida.";
    if (!form.iva || Number(form.iva) < 0 || Number(form.iva) > 100) nextErrors.iva = "Taxa de IVA inválida.";
    return nextErrors;
  }

  function validateMinimo() {
    const nextErrors = {};
    if (!form.valorLiquidoMinimo || Number(form.valorLiquidoMinimo) < 0) nextErrors.valorLiquidoMinimo = "Mínimo do vendedor obrigatório.";
    if (!form.iva || Number(form.iva) < 0 || Number(form.iva) > 100) nextErrors.iva = "Taxa de IVA inválida.";
    if (form.modoMinimo === "preco") {
      if (!form.valorVendaProposto || Number(form.valorVendaProposto) <= 0) nextErrors.valorVendaProposto = "Valor de venda proposto obrigatório.";
    }
    if (form.modoMinimo === "comissao") {
      if (!form.comissaoPretendida || Number(form.comissaoPretendida) < 0) nextErrors.comissaoPretendida = "Comissão pretendida inválida.";
    }
    return nextErrors;
  }

  function calculateModel(modelKey, currentForm) {
    let nextErrors = {};
    let nextResult = null;

    if (modelKey === "percentual") {
      nextErrors = validatePercentual();
      if (Object.keys(nextErrors).length) {
        return { errors: nextErrors, result: null };
      }

      nextResult = calcularPercentual({
        venda: currentForm.venda,
        percentual: currentForm.percentual,
        iva: currentForm.iva,
        modoIva: "acresce"
      });
    }

    if (modelKey === "negociacao") {
      nextErrors = validateNegociacao();
      if (Object.keys(nextErrors).length) {
        return { errors: nextErrors, result: null };
      }

      nextResult = calcularNegociacaoValor({
        valorVendaOriginal: currentForm.valorVendaOriginal,
        percentualOriginal: currentForm.percentualOriginal,
        novoValorVenda: currentForm.novoValorVenda,
        novaComissao: currentForm.novaComissao,
        comissaoIncluiIva: currentForm.comissaoIncluiIva === "true",
        iva: currentForm.iva
      });
    }

    if (modelKey === "minimo") {
      nextErrors = validateMinimo();
      if (Object.keys(nextErrors).length) {
        return { errors: nextErrors, result: null };
      }

      if (currentForm.modoMinimo === "preco") {
        nextResult = calcularMinimoVendedorPorPreco({
          minimoVendedor: currentForm.valorLiquidoMinimo,
          valorVenda: currentForm.valorVendaProposto,
          iva: currentForm.iva
        });
      } else {
        nextResult = calcularMinimoVendedorPorComissao({
          minimoVendedor: currentForm.valorLiquidoMinimo,
          comissaoPretendida: currentForm.comissaoPretendida,
          iva: currentForm.iva
        });
      }
    }

    return { errors: {}, result: nextResult };
  }

  function handleCalculate() {
    const { errors: nextErrors, result: nextResult } = calculateModel(modelo, form);
    setErrors(nextErrors);
    setResultado(nextResult);

    if (nextResult) {
      window.requestAnimationFrame(() => {
        resultSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  const renderRows = (entries) => {
    if (!entries || !entries.length) return null;
    return entries.map(([label, description, value]) => (
      <div key={label} style={styles.resultRow}>
        <div style={styles.resultTextWrap}>
          <span style={styles.resultLabel}>{label}</span>
          <small style={styles.resultDescription}>{description}</small>
        </div>
        <strong style={styles.resultValue}>{value}</strong>
      </div>
    ));
  };

  const percentModelResult = resultado && modelo === "percentual" ? [
    ["Comissão sem IVA", "Valor da comissão de intermediação antes da aplicação do IVA.", formatMoney(resultado.comissaoSemIva)],
    ["IVA", "Valor do IVA aplicado à comissão de intermediação.", formatMoney(resultado.iva)],
    ["Comissão com IVA", "Valor total da comissão suportado pelo vendedor, incluindo IVA.", formatMoney(resultado.comissaoComIva)],
    ["Valor de venda", "Preço de venda ao público considerado no cálculo.", formatMoney(resultado.valorVenda)],
    ["Valor líquido vendedor", "Valor que resta ao vendedor após a dedução da comissão com IVA.", formatMoney(resultado.liquidoVendedor)]
  ] : null;

  const negociacaoResult = resultado && modelo === "negociacao" ? [
    ["Comissão sem IVA", "Valor base da comissão antes do IVA.", formatMoney(resultado.comissaoSemIva)],
    ["IVA", "Imposto aplicado sobre a comissão negociada.", formatMoney(resultado.iva)],
    ["Comissão com IVA", "Valor final da comissão incluindo IVA.", formatMoney(resultado.comissaoComIva)],
    ["% efetiva", "Percentagem real da comissão sobre o novo valor de venda.", `${formatPercent(resultado.percentualEfetivo)} %`],
    ["Comissão pela % original", "Resultado da percentagem original aplicada ao novo valor de venda.", formatMoney(resultado.comissaoPelaPercentualOriginal)],
    ["Redução adicional", "Diferença entre a Comissão pela % original e a comissão negociada.", formatMoney(resultado.reducaoAdicional)],
    ["Valor líquido vendedor", "Valor que resta ao vendedor após a comissão final.", formatMoney(resultado.liquidoVendedor)]
  ] : null;

  const minimoResult = resultado && modelo === "minimo" ? (
    form.modoMinimo === "preco"
      ? [
          ["Comissão com IVA", "Valor total da comissão a pagar incluindo IVA.", formatMoney(resultado.comissaoComIva)],
          ["Comissão sem IVA", "Valor da comissão antes da tributação.", formatMoney(resultado.comissaoSemIva)],
          ["IVA incluído", "Imposto calculado sobre a comissão.", formatMoney(resultado.iva)],
          ["% comissão efetiva", "Percentagem real da comissão sobre o valor de venda.", `${formatPercent(resultado.percentualEfetivo)} %`]
        ]
      : [
          ["% comissão pretendida", "Percentagem média pretendida sobre o valor de venda.", `${formatPercent(resultado.percentualPretendida)} %`],
          ["IVA", "Imposto correspondente à comissão pretendida.", formatMoney(resultado.iva)],
          ["Comissão com IVA", "Total da comissão a suportar pelo vendedor.", formatMoney(resultado.comissaoComIva)],
          ["Valor de venda necessário", "Preço mínimo para atingir a comissão pretendida.", formatMoney(resultado.valorVendaNecessario)]
        ]
  ) : null;

  return (
    <>
      <style>{`
        @media (max-width: 720px) {
          .osflow-calculator-shell {
            padding: 12px !important;
          }
          .osflow-calculator-grid {
            grid-template-columns: 1fr !important;
          }
          .osflow-calculator-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .osflow-calculator-actions {
            width: 100% !important;
          }
        }
      `}</style>

      <div className="osflow-calculator-shell" style={styles.pageShell}>
        <PageHeader
          title="Calculadora de Comissões"
          subtitle="Compare cenários, valide valores e obtenha rapidamente o resultado líquido do vendedor."
          compact
          style={{ paddingTop: 0, paddingBottom: 12 }}
        />

        <Card style={styles.card}>
          <div style={styles.toolbar} className="osflow-calculator-toolbar">
            <div style={styles.segmentedWrap}>
              {MODELS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setModelo(item.key);
                    setResultado(null);
                    setErrors({});
                  }}
                  style={{
                    ...styles.segmentedButton,
                    ...(modelo === item.key ? styles.segmentedButtonActive : {})
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={(event) => {
            event.preventDefault();
            handleCalculate();
          }} style={styles.form}>
            {modelo === "percentual" && (
              <div className="osflow-calculator-grid" style={styles.grid}>
                <Input
                  label="Valor de venda ao público"
                  type="text"
                  inputMode="decimal"
                  value={form.venda}
                  onChange={(event) => updateField("venda", normalizeMoneyInput(event.target.value))}
                  onBlur={(event) => updateField("venda", formatMoneyInput(event.target.value))}
                  error={errors.venda}
                />
                <Input
                  label="% Comissão acordada"
                  type="text"
                  inputMode="decimal"
                  value={form.percentual}
                  onChange={(event) => updateField("percentual", normalizePercentInput(event.target.value))}
                  onBlur={(event) => updateField("percentual", formatPercentInput(event.target.value))}
                  error={errors.percentual}
                />
                <Input
                  label="Taxa de IVA"
                  type="text"
                  inputMode="decimal"
                  value={form.iva}
                  onChange={(event) => updateField("iva", normalizePercentInput(event.target.value))}
                  onBlur={(event) => updateField("iva", formatPercentInput(event.target.value))}
                  error={errors.iva}
                />
              </div>
            )}

            {modelo === "negociacao" && (
              <div className="osflow-calculator-grid" style={styles.grid}>
                <div style={styles.sectionTitle}>Acordo original</div>
                <Input
                  label="Valor de venda original"
                  type="text"
                  inputMode="decimal"
                  value={form.valorVendaOriginal}
                  onChange={(event) => updateField("valorVendaOriginal", normalizeMoneyInput(event.target.value))}
                  onBlur={(event) => updateField("valorVendaOriginal", formatMoneyInput(event.target.value))}
                  error={errors.valorVendaOriginal}
                />
                <Input
                  label="% Comissão original"
                  type="text"
                  inputMode="decimal"
                  value={form.percentualOriginal}
                  onChange={(event) => updateField("percentualOriginal", normalizePercentInput(event.target.value))}
                  onBlur={(event) => updateField("percentualOriginal", formatPercentInput(event.target.value))}
                  error={errors.percentualOriginal}
                />

                <div style={styles.sectionTitle}>Nova negociação</div>
                <Input
                  label="Novo valor de venda"
                  type="text"
                  inputMode="decimal"
                  value={form.novoValorVenda}
                  onChange={(event) => updateField("novoValorVenda", normalizeMoneyInput(event.target.value))}
                  onBlur={(event) => updateField("novoValorVenda", formatMoneyInput(event.target.value))}
                  error={errors.novoValorVenda}
                />
                <Input
                  label="Nova comissão negociada"
                  type="text"
                  inputMode="decimal"
                  value={form.novaComissao}
                  onChange={(event) => updateField("novaComissao", normalizeMoneyInput(event.target.value))}
                  onBlur={(event) => updateField("novaComissao", formatMoneyInput(event.target.value))}
                  error={errors.novaComissao}
                />
                <Select
                  label="Comissão já inclui IVA?"
                  value={form.comissaoIncluiIva}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    updateField("comissaoIncluiIva", nextValue);
                    if (modelo === "negociacao") {
                      const nextForm = { ...form, comissaoIncluiIva: nextValue };
                      const { errors: nextErrors, result: nextResult } = calculateModel("negociacao", nextForm);
                      setErrors(nextErrors);
                      setResultado(nextResult);
                    }
                  }}
                  options={[
                    { value: "false", label: "Não" },
                    { value: "true", label: "Sim" }
                  ]}
                />
                <Input
                  label="Taxa de IVA"
                  type="text"
                  inputMode="decimal"
                  value={form.iva}
                  onChange={(event) => updateField("iva", normalizePercentInput(event.target.value))}
                  onBlur={(event) => updateField("iva", formatPercentInput(event.target.value))}
                  error={errors.iva}
                />
              </div>
            )}

            {modelo === "minimo" && (
              <div className="osflow-calculator-grid" style={styles.grid}>
                <Input
                  label="Valor líquido mínimo aceite pelo vendedor"
                  type="text"
                  inputMode="decimal"
                  value={form.valorLiquidoMinimo}
                  onChange={(event) => updateField("valorLiquidoMinimo", normalizeMoneyInput(event.target.value))}
                  onBlur={(event) => updateField("valorLiquidoMinimo", formatMoneyInput(event.target.value))}
                  error={errors.valorLiquidoMinimo}
                />
                <Input
                  label="Taxa de IVA"
                  type="text"
                  inputMode="decimal"
                  value={form.iva}
                  onChange={(event) => updateField("iva", normalizePercentInput(event.target.value))}
                  onBlur={(event) => updateField("iva", formatPercentInput(event.target.value))}
                  error={errors.iva}
                />

                <div style={styles.fullSpan}>
                  <div style={styles.modeToggleWrap}>
                    <button
                      type="button"
                      onClick={() => updateField("modoMinimo", "preco")}
                      style={{
                        ...styles.modeToggleButton,
                        ...(form.modoMinimo === "preco" ? styles.modeToggleButtonActive : {})
                      }}
                    >
                      A — A partir do valor de venda
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField("modoMinimo", "comissao")}
                      style={{
                        ...styles.modeToggleButton,
                        ...(form.modoMinimo === "comissao" ? styles.modeToggleButtonActive : {})
                      }}
                    >
                      B — A partir da comissão pretendida
                    </button>
                  </div>
                </div>

                {form.modoMinimo === "preco" ? (
                  <Input
                    label="Valor de venda proposto"
                    type="text"
                    inputMode="decimal"
                    value={form.valorVendaProposto}
                    onChange={(event) => updateField("valorVendaProposto", normalizeMoneyInput(event.target.value))}
                    onBlur={(event) => updateField("valorVendaProposto", formatMoneyInput(event.target.value))}
                    error={errors.valorVendaProposto}
                  />
                ) : (
                  <Input
                    label="Comissão pretendida pela agência (sem IVA)"
                    type="text"
                    inputMode="decimal"
                    value={form.comissaoPretendida}
                    onChange={(event) => updateField("comissaoPretendida", normalizeMoneyInput(event.target.value))}
                    onBlur={(event) => updateField("comissaoPretendida", formatMoneyInput(event.target.value))}
                    error={errors.comissaoPretendida}
                  />
                )}
              </div>
            )}

            <div style={styles.actions} className="osflow-calculator-actions">
              <Button type="button" variant="light" onClick={handleClear} style={{ minWidth: 140 }}>
                Limpar
              </Button>
              <Button type="submit" style={{ minWidth: 180 }}>
                Calcular
              </Button>
            </div>
          </form>
        </Card>

        {resultado && (
          <Card ref={resultSectionRef} style={{ ...styles.card, marginTop: 16 }}>
            <div style={styles.resultHeader}>Resultado</div>
            <div style={styles.resultList}>
              {renderRows(percentModelResult || negociacaoResult || minimoResult)}
            </div>
          </Card>
        )}

        <button
          type="button"
          aria-label="Voltar ao topo"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{
            ...styles.backToTop,
            opacity: showBackToTop ? 1 : 0,
            transform: showBackToTop ? "translateY(0)" : "translateY(12px)",
            pointerEvents: showBackToTop ? "auto" : "none"
          }}
        >
          ↑
        </button>
      </div>
    </>
  );
}

function formatMoney(value) {
  if (!Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value));
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value));
}

const styles = {
  pageShell: {
    display: "grid",
    gap: 16,
    padding: "12px 20px 20px"
  },
  card: {
    padding: 20,
    borderRadius: 18,
    background: "var(--os-color-surface)",
    border: "1px solid var(--os-color-border)",
    boxShadow: "0 1px 3px rgba(16, 34, 45, 0.04)"
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 18
  },
  segmentedWrap: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    width: "100%"
  },
  segmentedButton: {
    flex: "1 1 180px",
    minHeight: 42,
    borderRadius: 10,
    border: "1px solid var(--os-color-border)",
    background: "var(--os-color-surface-soft)",
    color: "var(--os-color-primary)",
    fontWeight: 600,
    padding: "10px 12px",
    cursor: "pointer",
    transition: "all 160ms ease"
  },
  segmentedButtonActive: {
    background: "var(--os-color-primary)",
    borderColor: "var(--os-color-primary)",
    color: "var(--os-color-text-light)"
  },
  form: {
    display: "grid",
    gap: 18
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16
  },
  sectionTitle: {
    gridColumn: "1 / -1",
    fontSize: 14,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "var(--os-color-primary)",
    background: "var(--os-color-surface-soft)",
    border: "1px solid var(--os-color-border)",
    borderRadius: 10,
    padding: "10px 12px",
    fontWeight: 700
  },
  fullSpan: {
    gridColumn: "1 / -1"
  },
  modeToggleWrap: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))"
  },
  modeToggleButton: {
    minHeight: 42,
    borderRadius: 10,
    border: "1px solid var(--os-color-border)",
    background: "var(--os-color-surface-soft)",
    color: "var(--os-color-primary)",
    padding: "10px 12px",
    fontWeight: 600,
    cursor: "pointer"
  },
  modeToggleButtonActive: {
    background: "var(--os-color-accent)",
    borderColor: "var(--os-color-accent)",
    color: "var(--os-color-text-light)"
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
    flexWrap: "wrap"
  },
  resultHeader: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: 700,
    color: "var(--os-color-text)"
  },
  resultList: {
    display: "grid",
    gap: 10
  },
  resultRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    border: "1px solid var(--os-color-border)",
    borderRadius: 12,
    background: "var(--os-color-surface-soft)",
    padding: "10px 12px"
  },
  resultTextWrap: {
    display: "grid",
    gap: 4,
    minWidth: 0,
    flex: 1
  },
  resultLabel: {
    color: "var(--os-color-primary)",
    fontSize: 14,
    fontWeight: 700
  },
  resultDescription: {
    color: "var(--os-color-primary)",
    fontSize: 12,
    lineHeight: 1.4
  },
  resultValue: {
    color: "var(--os-color-text)",
    fontSize: 15,
    whiteSpace: "nowrap",
    textAlign: "right"
  },
  backToTop: {
    position: "fixed",
    right: 20,
    bottom: 20,
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "none",
    background: "var(--os-color-primary)",
    color: "var(--os-color-text-light)",
    boxShadow: "0 8px 20px rgba(22, 92, 165, 0.28)",
    fontSize: 22,
    lineHeight: 1,
    cursor: "pointer",
    transition: "opacity 180ms ease, transform 180ms ease",
    zIndex: 50
  }
};
