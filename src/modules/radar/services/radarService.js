import { RadarRepository } from "../repositories/RadarRepository";
import { createRadarViewModel } from "../viewmodels/radarViewModel";
import { salvarLeadFluxo } from "../../leads/services";
import { buildConfiguredRadarProvider } from "./radarProviderConfig";
import {
  appendRadarMetadataBlockOnce,
  buildRadarLeadMetadata
} from "../contracts/radarLeadMetadata";
import { supabase } from "../../../supabase";
import {
  applyEmpresaScope,
  buildMissingEmpresaError,
  hasEmpresaId,
  resolveEmpresaId,
  warnMissingEmpresaId
} from "../../../utils/empresaScope";

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
  const normalizedScore = normalizeNumericScore(opportunity?.score);

  return {
    ...opportunity,
    score: normalizedScore,
    classificacao: classifyOpportunity({ ...opportunity, score: normalizedScore })
  };
}

function sortByScore(opportunities) {
  return [...opportunities].sort((a, b) => b.score - a.score);
}

function resolveLeadOriginFromProvider(providerValue) {
  const normalized = String(providerValue || "").trim().toLowerCase();

  if (normalized.includes("imovirtual")) return "Imovirtual";
  if (normalized.includes("olx")) return "OLX";
  if (normalized.includes("idealista")) return "Idealista";

  const text = String(providerValue || "").trim();
  return text || "Radar";
}

function mapOpportunityToLeadPayload(opportunity, user) {
  const origemProvider = String(opportunity?.origem || "RadarProvider");
  const metadata = buildRadarLeadMetadata({
    provider: opportunity?.radarLeadMetadata?.provider || origemProvider,
    externalId: opportunity?.radarLeadMetadata?.externalId || opportunity?.id_externo || opportunity?.id,
    url: opportunity?.radarLeadMetadata?.url || opportunity?.url_original || opportunity?.url,
    publisherName: opportunity?.radarLeadMetadata?.publisherName || opportunity?.anunciante_nome || "",
    publisherContact: opportunity?.radarLeadMetadata?.publisherContact || opportunity?.contacto?.telefone || opportunity?.contacto?.email || "",
    publishedAt: opportunity?.radarLeadMetadata?.publishedAt || opportunity?.data_publicacao || opportunity?.publicado_em,
    capturedAt: opportunity?.radarLeadMetadata?.capturedAt || opportunity?.data_recolha || opportunity?.encontrado_em,
    score: opportunity?.score,
    status: opportunity?.estado
  });

  const advertiserName = metadata.publisherName || null;
  const contactPhone = opportunity?.contacto?.telefone || null;
  const contactEmail = opportunity?.contacto?.email || null;
  const contactLabel = [contactPhone, contactEmail].filter(Boolean).join(" | ");

  const nomeLeadBase = advertiserName || opportunity?.titulo || "Lead Radar";
  const nome = contactLabel ? `${nomeLeadBase} (${contactLabel})` : nomeLeadBase;
  const telefoneLead = contactPhone || null;

  const observacaoBase = [
    `Importado via Radar (${new Date().toISOString()})`,
    `Título: ${opportunity?.titulo || "-"}`,
    `Local: ${opportunity?.morada || "-"}, ${opportunity?.cidade || "-"}`,
    `Preço: ${opportunity?.preco || "-"}`
  ].join("\n");

  const observacao = appendRadarMetadataBlockOnce(observacaoBase, metadata);

  return {
    nome,
    telefone: telefoneLead,
    tipo: opportunity?.score >= 85 ? "quente" : opportunity?.score >= 75 ? "morno" : "frio",
    origem: resolveLeadOriginFromProvider(metadata.provider || opportunity?.source || opportunity?.origem),
    observacao,
    user
  };
}

export class RadarService {
  constructor(repository = new RadarRepository()) {
    this.repository = repository;
    this.sessionOpportunities = null;
  }

  setProvider(provider) {
    this.repository.setProvider(provider);
  }

  async loadOpportunities() {
    // Forçar carregamento dos dados reais ignorando a cache da sessão
    const loaded = await this.repository.listOpportunities();
    this.sessionOpportunities = loaded;
    return loaded || [];
  }

  classifyOpportunities(opportunities = []) {
    return opportunities.map((item) => normalizeOpportunity(item));
  }

  sortByScore(opportunities = []) {
    return sortByScore(opportunities);
  }

  async loadProviderRegistryState() {
    const empresaId = await resolveEmpresaId();
    if (!hasEmpresaId(empresaId)) {
      warnMissingEmpresaId();
      return [];
    }

    const { data, error } = await supabase
      .from("provider_registry")
      .select("provider_code,last_execution,next_execution,last_error,sync_running,enabled");

    if (error) {
      console.warn("[Radar] Falha ao carregar provider_registry:", error);
      return null;
    }

    return data || [];
  }

  createSnapshotFromOpportunities(opportunities = [], providerRegistry = null) {
    const ordered = this.sortByScore(opportunities);
    this.sessionOpportunities = [...ordered];

    const snapshot = createRadarViewModel({
      opportunities: ordered,
      providerRegistry
    });

    return {
      ...snapshot,
      opportunities: ordered
    };
  }

  async getSnapshot() {
    const loaded = await this.loadOpportunities();
    const classified = this.classifyOpportunities(loaded);
    const providerRegistry = await this.loadProviderRegistryState();
    return this.createSnapshotFromOpportunities(classified, providerRegistry);
  }

  async updateOpportunityState(opportunityId, nextState) {
    const targetId = String(opportunityId || "").trim();
    const normalizedState = String(nextState || "").toLowerCase();

    if (!targetId) {
      return {
        ok: false,
        message: "Oportunidade inválida."
      };
    }

    const supportedStates = ["novo", "importado", "ignorado"];
    if (!supportedStates.includes(normalizedState)) {
      return {
        ok: false,
        message: "Estado operacional inválido."
      };
    }

    const loaded = await this.loadOpportunities();
    const now = new Date().toISOString();
    const updated = loaded.map((item) => {
      if (String(item?.id) !== targetId) return item;

      const base = {
        ...item,
        estado: normalizedState
      };

      if (normalizedState === "importado") {
        base.importado_em = now;
      }

      if (normalizedState === "ignorado") {
        base.ignorado_em = now;
      }

      return base;
    });

    const classified = this.classifyOpportunities(updated);
    const providerRegistry = await this.loadProviderRegistryState();
    const snapshot = this.createSnapshotFromOpportunities(classified, providerRegistry);

    return {
      ok: true,
      snapshot
    };
  }

  async importOpportunityToLeads(opportunity, user) {
    if (!opportunity) {
      return {
        ok: false,
        message: "Oportunidade inválida para importação."
      };
    }

    console.info("[Radar Import] iniciar", {
      opportunityId: opportunity?.id || null,
      source: opportunity?.source || opportunity?.origem || null
    });

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

    const opportunitySource = String(opportunity?.origem || opportunity?.source || "").toLowerCase();
    if (opportunitySource === "imovirtual") {
      const importedBy = user?.perfil_id || user?.id || null;
      const empresaId = await resolveEmpresaId(user);
      if (!hasEmpresaId(empresaId)) {
        warnMissingEmpresaId();
        return {
          ok: false,
          message: "Operacao sem empresa_id",
          error: buildMissingEmpresaError()
        };
      }

      const scopedUpdate = applyEmpresaScope(supabase
        .from("provider_leads")
        .update({
          imported: true,
          empresa_id: empresaId,
          crm_lead_id: result?.id || null,
          imported_at: new Date().toISOString(),
          imported_by: importedBy
        })
        .eq("id", opportunity.id), empresaId);

      const { error: providerLeadUpdateError } = await scopedUpdate;

      if (providerLeadUpdateError) {
        return {
          ok: false,
          message: providerLeadUpdateError.message || "Falha ao atualizar provider_leads após importação.",
          error: providerLeadUpdateError
        };
      }
    }

    await this.updateOpportunityState(opportunity?.id, "importado");

    console.info("[Radar Import] concluido", {
      opportunityId: opportunity?.id || null,
      imported: true
    });

    return {
      ok: true,
      message: "Oportunidade importada para Leads com sucesso."
    };
  }

}

const radarService = new RadarService(new RadarRepository(buildConfiguredRadarProvider()));

export function clearRadarDataProvider() {
  radarService.sessionOpportunities = null;
  radarService.setProvider(buildConfiguredRadarProvider());
}

export async function fetchRadarSnapshot() {
  return radarService.getSnapshot();
}

export function getRadarService() {
  return radarService;
}

