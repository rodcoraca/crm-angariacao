const LEAD_ORIGIN_DEFINITIONS = Object.freeze([
  { value: "OLX.pt", label: "OLX.pt" },
  { value: "CustoJusto", label: "CustoJusto" },
  { value: "Idealista", label: "Idealista" },
  { value: "Imovirtual", label: "Imovirtual" },
  { value: "Casa Sapo", label: "Casa Sapo" },
  { value: "Facebook", label: "Facebook" },
  { value: "Instagram", label: "Instagram" },
  { value: "site", label: "Website", displayLabel: "Site de imóveis" },
  { value: "indicacao", label: "Indicação" },
  { value: "placa", label: "Placa", displayLabel: "Placa na rua" },
  { value: "Telefone", label: "Telefone" },
  { value: "outro", label: "Outro" }
]);

export function listarOrigensLead({ includeOutro = true } = {}) {
  return LEAD_ORIGIN_DEFINITIONS
    .filter((item) => includeOutro || item.value !== "outro")
    .map((item) => ({ value: item.value, label: item.label }));
}

export function criarOpcoesDropdownOrigemLead({
  includeSemOrigem = false,
  includeOutro = false,
  currentValue = ""
} = {}) {
  const options = listarOrigensLead({ includeOutro });

  if (currentValue && !options.some((item) => item.value === currentValue)) {
    options.push({ value: currentValue, label: currentValue });
  }

  if (!includeSemOrigem) return options;

  return [{ value: "", label: "Sem origem" }, ...options];
}

export function criarOpcoesFiltroOrigemLead(leads = []) {
  const options = criarOpcoesDropdownOrigemLead({ includeSemOrigem: true, includeOutro: false });
  const knownValues = new Set(options.map((item) => item.value));

  (leads || []).forEach((lead) => {
    const origem = String(lead?.origem || "").trim();
    if (!origem || knownValues.has(origem)) return;
    options.push({ value: origem, label: origem });
    knownValues.add(origem);
  });

  return options;
}

export function criarOpcoesFluxoOrigemLead() {
  return listarOrigensLead({ includeOutro: false })
    .filter((item) => item.value !== "outro")
    .map((item) => ({ texto: item.label, next: "dados", origem: item.value }));
}

export function formatarOrigemComCatalogo(origem) {
  const normalizada = String(origem || "").trim();
  if (!normalizada) return "Sem origem";

  const encontrada = LEAD_ORIGIN_DEFINITIONS.find((item) => item.value === normalizada);
  if (!encontrada) return normalizada;

  return encontrada.displayLabel || encontrada.label;
}
