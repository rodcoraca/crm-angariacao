import { queryCountLeadsByStatus } from "../repositories";
import { countRows } from "./sharedQueries";

export async function fetchCockpitPipeline() {
  const [novoCount, contactoCount, agendamentoCount, convertidoCount] = await Promise.all([
    countRows(queryCountLeadsByStatus("novo")),
    countRows(queryCountLeadsByStatus("em_contacto")),
    countRows(queryCountLeadsByStatus("agendamento")),
    countRows(queryCountLeadsByStatus("convertido"))
  ]);

  return {
    "pipeline-novo": String(novoCount),
    "pipeline-contactado": String(contactoCount),
    "pipeline-agendado": String(agendamentoCount),
    "pipeline-fechado": String(convertidoCount)
  };
}
