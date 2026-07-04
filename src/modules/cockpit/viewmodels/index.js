import { createKpisViewModel } from "./kpisViewModel";
import { createPipelineViewModel } from "./pipelineViewModel";
import { createAcoesViewModel } from "./acoesViewModel";
import { createAgendaViewModel } from "./agendaViewModel";
import { createImoveisRiscoViewModel } from "./imoveisRiscoViewModel";
import { createProdutividadeViewModel } from "./produtividadeViewModel";
import { createAtividadesViewModel } from "./atividadesViewModel";

export function createCockpitViewModel(theme) {
  return {
    kpis: createKpisViewModel(theme),
    acoesImediatas: createAcoesViewModel(),
    agendaOperacional: createAgendaViewModel(),
    pipeline: createPipelineViewModel(),
    imoveisRisco: createImoveisRiscoViewModel(),
    produtividade: createProdutividadeViewModel(),
    ultimasAtividades: createAtividadesViewModel()
  };
}
