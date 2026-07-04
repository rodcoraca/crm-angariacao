import { calcularIndiceSaudeImovel } from "../utils/mappers";

export function mapCockpitRiskData(raw) {
  const imoveis = raw?.imoveis || [];
  const ficheiros = raw?.ficheiros || [];

  const ficheirosPorImovel = ficheiros.reduce((acc, item) => {
    const key = item.imovel_id;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return imoveis
    .map((imovel) => calcularIndiceSaudeImovel(imovel, ficheirosPorImovel[imovel.id] || 0))
    .sort((a, b) => a.percentualCompletude - b.percentualCompletude);
}
