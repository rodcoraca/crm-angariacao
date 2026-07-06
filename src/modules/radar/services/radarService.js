import { MockRadarProvider } from "../providers/MockRadarProvider";
import { RadarRepository } from "../repositories/RadarRepository";
import { createRadarViewModel } from "../viewmodels/radarViewModel";
import { salvarLeadFluxo } from "../../leads/services";

function normalizeNumericScore(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function classifyOpportunity(opportunity) {
  const score = normalizeNumericScore(opportunity?.score);

  if (score >= 90) return "prioritario";
  if (score >= 80) return "elevado";
  if (score >= 70) return "medio";
  return "base";
}

function normalizeOpportunity(opportunity) {
  return {
    ...opportunity,
    score: normalizeNumericScore(opportunity?.score),
    classificacao: classifyOpportunity(opportunity)
  };
}

function sortByScore(opportunities) {
  return [...opportunities].sort((a, b) => b.score - a.score);
}

function buildRadarPhone(opportunityId) {
  const raw = String(opportunityId || "");
  let hash = 0;

  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) % 100000000;
  }

  const localNumber = String(hash).padStart(8, "0");
  return `3519${localNumber}`;
}

function mapOpportunityToLeadPayload(opportunity, user) {
  return {
    nome: opportunity?.titulo || "Lead Radar",
    telefone: buildRadarPhone(opportunity?.id),
    tipo: opportunity?.score >= 85 ? "quente" : opportunity?.score >= 75 ? "morno" : "frio",
    origem: `radar_${opportunity?.origem || "mock"}`,
    observacao: [
      `Importado via Radar (${new Date().toISOString()})`,
      `Título: ${opportunity?.titulo || "-"}`,
      `Local: ${opportunity?.morada || "-"}, ${opportunity?.cidade || "-"}`,
      `Preço: ${opportunity?.preco || "-"}`,
      `Score: ${opportunity?.score || 0}`,
      `URL: ${opportunity?.url || "-"}`
    ].join("\n"),
    user
  };
}

export class RadarService {
  constructor(repository = new RadarRepository()) {
    this.repository = repository;
  }

  setProvider(provider) {
    this.repository.setProvider(provider);
  }

  async loadOpportunities() {
    const loaded = await this.repository.listOpportunities();
    return loaded || [];
  }

  classifyOpportunities(opportunities = []) {
    return opportunities.map((item) => normalizeOpportunity(item));
  }

  sortByScore(opportunities = []) {
    return sortByScore(opportunities);
  }

  buildOperationalFlow() {
    return [
      { id: "flow-atualizar", label: "Atualizar Radar" },
      { id: "flow-carregar", label: "Carregar oportunidades" },
      { id: "flow-classificar", label: "Classificar" },
      { id: "flow-ordenar", label: "Ordenar por Score" },
      { id: "flow-tabela", label: "Apresentar tabela" },
      { id: "flow-detalhe", label: "Abrir detalhe" },
      { id: "flow-importar", label: "Importar para Leads" }
    ];
  }

  async getSnapshot() {
    const loaded = await this.loadOpportunities();
    const classified = this.classifyOpportunities(loaded);
    const ordered = this.sortByScore(classified);

    const snapshot = createRadarViewModel({ opportunities: ordered });

    return {
      ...snapshot,
      opportunities: ordered,
      flow: this.buildOperationalFlow()
    };
  }

  async importOpportunityToLeads(opportunity, user) {
    if (!opportunity) {
      return {
        ok: false,
        message: "Oportunidade inválida para importação."
      };
    }

    const payload = mapOpportunityToLeadPayload(opportunity, user);
    const result = await salvarLeadFluxo(payload);

    if (result?.error) {
      return {
        ok: false,
        message: result.error.message || "Falha ao importar oportunidade para Leads.",
        error: result.error
      };
    }

    if (result?.duplicateLead) {
      return {
        ok: false,
        duplicate: true,
        message: "Lead já existente para esta oportunidade.",
        duplicateLead: result.duplicateLead
      };
    }

    return {
      ok: true,
      message: "Oportunidade importada para Leads com sucesso."
    };
  }
}

const radarService = new RadarService();

export function registerRadarDataProvider(provider) {
  if (provider && typeof provider.listOpportunities === "function") {
    radarService.setProvider(provider);
    return;
  }

  if (typeof provider === "function") {
    radarService.setProvider({ listOpportunities: provider });
  }
}

export function clearRadarDataProvider() {
  radarService.setProvider(new MockRadarProvider());
}

export async function fetchRadarSnapshot() {
  return radarService.getSnapshot();
}

export function getRadarService() {
  return radarService;
}
