export {
  alterarTipoLead,
  carregarFichaLead,
  carregarLeadsDashboard,
  carregarLeadsPorTipo,
  salvarFichaLead,
  salvarLeadFluxo,
  salvarObservacaoLead,
  transferirLead,
  validarEntradaTelefone,
  verificarLeadExistente
} from "./leadsService";

export { canManageLead, canTransferLead } from "./leadPermissionService";

export {
  carregarAgentesParaFicha,
  carregarAgentesParaLeads,
  obterNomeUtilizadorAtual,
  resolverNomeAgente
} from "./agentService";
