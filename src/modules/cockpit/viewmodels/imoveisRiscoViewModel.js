export function createImoveisRiscoViewModel() {
  return [
    { id: "risco-documentacao-incompleta", title: "Documentacao incompleta", description: "Processos com documentos em falta para validacao.", badge: "11", variant: "danger", meta: "Placeholder" },
    { id: "risco-dados-em-falta", title: "Dados em falta", description: "Registos com campos essenciais por completar.", badge: "7", variant: "warning", meta: "Placeholder" },
    { id: "risco-sem-ficheiros", title: "Sem ficheiros", description: "Imoveis sem anexos obrigatorios carregados.", badge: "4", variant: "neutral", meta: "Placeholder" }
  ];
}
