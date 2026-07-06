import { queryCountLeadsByStatus } from "../repositories";
import { countRows } from "./sharedQueries";

export async function fetchCockpitPipeline() {
  const [novoCount, contactadoCount, agendadoCount, fechadoCount] = await Promise.all([
    countRows(queryCountLeadsByStatus("novo")),
    countRows(queryCountLeadsByStatus("contactado")),
    countRows(queryCountLeadsByStatus("agendado")),
    countRows(queryCountLeadsByStatus("fechado"))
  ]);

  return {
    "pipeline-novo": String(novoCount),
    "pipeline-contactado": String(contactadoCount),
    "pipeline-agendado": String(agendadoCount),
    "pipeline-fechado": String(fechadoCount)
  };
}
