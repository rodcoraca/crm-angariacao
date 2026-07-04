const KPI_IDS = [
  "kpi-leads-ativas",
  "kpi-leads-sem-contacto",
  "kpi-leads-agendadas",
  "kpi-negocios-fechados",
  "kpi-imoveis-incompletos",
  "kpi-atividades-hoje"
];

export const INITIAL_COCKPIT_KPI_VALUES = {
  "kpi-leads-ativas": "...",
  "kpi-leads-sem-contacto": "...",
  "kpi-leads-agendadas": "...",
  "kpi-negocios-fechados": "...",
  "kpi-imoveis-incompletos": "...",
  "kpi-atividades-hoje": "..."
};

export const ERROR_COCKPIT_KPI_VALUES = {
  "kpi-leads-ativas": "--",
  "kpi-leads-sem-contacto": "--",
  "kpi-leads-agendadas": "--",
  "kpi-negocios-fechados": "--",
  "kpi-imoveis-incompletos": "--",
  "kpi-atividades-hoje": "--"
};

export function normalizeCockpitKpiValues(values) {
  const input = values || {};

  return KPI_IDS.reduce((acc, key) => {
    const value = input[key];
    acc[key] = value === null || value === undefined ? INITIAL_COCKPIT_KPI_VALUES[key] : String(value);
    return acc;
  }, {});
}

export function adaptCockpitKpis(kpisBase, kpiValues, hasError) {
  return (kpisBase || []).map((kpi) => ({
    ...kpi,
    valor: kpiValues[kpi.id] || (hasError ? "--" : "...")
  }));
}

export const COCKPIT_KPI_PLACEHOLDER_VALUES = INITIAL_COCKPIT_KPI_VALUES;
export const COCKPIT_KPI_ERROR_VALUES = ERROR_COCKPIT_KPI_VALUES;
export const mapCockpitKpiData = adaptCockpitKpis;