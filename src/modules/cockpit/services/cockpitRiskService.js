import { queryRiscoFicheiros, queryRiscoImoveis } from "../repositories";
import { fetchRows } from "./sharedQueries";

export async function fetchCockpitRisk() {
  const [imoveis, ficheiros] = await Promise.all([
    fetchRows(queryRiscoImoveis()),
    fetchRows(queryRiscoFicheiros())
  ]);

  return {
    imoveis,
    ficheiros
  };
}
