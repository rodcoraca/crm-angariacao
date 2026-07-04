const PIPELINE_IDS = [
  "pipeline-novo",
  "pipeline-contactado",
  "pipeline-agendado",
  "pipeline-fechado"
];

export const COCKPIT_PIPELINE_PLACEHOLDER_VALUES = PIPELINE_IDS.reduce((acc, id) => {
  acc[id] = "...";
  return acc;
}, {});

export const COCKPIT_PIPELINE_ERROR_VALUES = PIPELINE_IDS.reduce((acc, id) => {
  acc[id] = "--";
  return acc;
}, {});

export function normalizeCockpitPipelineValues(values) {
  const safeValues = values || {};

  return PIPELINE_IDS.reduce((acc, id) => {
    const value = safeValues[id];
    acc[id] = value === null || value === undefined ? "..." : String(value);
    return acc;
  }, {});
}

export function mapCockpitPipelineData(pipelineBase, pipelineValues, hasError) {
  return (pipelineBase || []).map((item) => ({
    ...item,
    value: pipelineValues[item.id] || (hasError ? "--" : "...")
  }));
}
