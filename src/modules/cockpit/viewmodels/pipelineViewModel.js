export function createPipelineViewModel() {
  return [
    { id: "pipeline-novo", label: "Novo", value: "38", hint: "Placeholder" },
    { id: "pipeline-contactado", label: "Contactado", value: "29", hint: "Placeholder" },
    { id: "pipeline-agendado", label: "Agendado", value: "17", hint: "Placeholder" },
    { id: "pipeline-fechado", label: "Fechado", value: "12", hint: "Placeholder" }
  ];
}

export function composePipeline(pipelineBase, pipelineValues, pipelineHasError) {
  return pipelineBase.map((item) => ({
    ...item,
    value: pipelineValues[item.id] || (pipelineHasError ? "--" : "...")
  }));
}
