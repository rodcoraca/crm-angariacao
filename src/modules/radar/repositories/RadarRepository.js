import { supabase } from "../../../supabase";
import { applyEmpresaScope, resolveEmpresaId } from "../../../utils/empresaScope.js";

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toScore(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function inferPropertyType(title, lead) {
  const raw = lead?.raw_data || {};
  if (raw.rooms || raw.roomsNumber || lead?.rooms) return "Apartamento";

  const upperTitle = String(title || "").toUpperCase();
  if (upperTitle.startsWith("V")) return "Moradia";
  if (upperTitle.includes("TERRENO")) return "Terreno";
  return "Outro";
}

function inferRooms(title, lead) {
  const roomsFromTitle = String(title || "").match(/T(\d+)/i);
  const raw = lead?.raw_data || {};
  const parsed = Number(roomsFromTitle?.[1] || lead?.rooms || raw?.rooms || raw?.roomsNumber || null);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeOpportunitySource(value) {
  const source = String(value || "").trim().toLowerCase();

  if (source === "crm") return "crm";
  if (source === "olx") return "olx";
  if (source === "idealista") return "idealista";
  if (source) return source;
  return "imovirtual";
}

function normalizeProviderEstado(lead) {
  if (lead?.is_inactive === true) return "inativo";
  if (lead?.imported === true) return "importado";
  if (lead?.is_new === true) return "novo";
  return "Ativa";
}

function isOlxPromotionReference(lead) {
  const provider = String(lead?.provider || lead?.source || "").trim().toLowerCase();
  if (provider !== "olx") return false;

  const raw = lead?.raw_data || {};
  return raw?.publishedAtSource === "promotion"
    || /^Para o topo\b/i.test(String(raw?.publishedAt || "").trim());
}

export function mapProviderLeadToOpportunity(lead) {
  const raw = lead?.raw_data || {};
  const title = lead?.title || raw?.title || "";
  const tipo = inferPropertyType(title, lead);
  const quartos = inferRooms(title, lead);
  const dataReferencia = lead?.created_at || null;
  const providerOrigin = String(lead?.provider || lead?.origem || lead?.source || raw?.source || "imovirtual").trim().toLowerCase();
  const source = normalizeOpportunitySource(providerOrigin);
  const ownerName = lead?.owner_name || raw?.ownerName || raw?.advertOwner?.name || "N/A";
  const explicitFreguesia = lead?.freguesia || raw?.freguesia || "";
  const freguesia = providerOrigin === "imovirtual" && !explicitFreguesia
    ? (lead?.city || raw?.city || "")
    : explicitFreguesia || raw?.location?.address?.city?.name || "";
  const city = lead?.city || raw?.city || freguesia || "";
  const district = lead?.district || raw?.district || raw?.location?.address?.province?.name || "";
  const municipality = raw?.municipality || raw?.location?.address?.county?.name || lead?.concelho || "";
  const locationLabel = lead?.location || raw?.locationLabel || [city, district].filter(Boolean).join(", ") || "N/A";
  const estado = normalizeProviderEstado(lead);
  const persistedScore = toScore(lead?.score ?? raw?.score ?? 0);
  const publishedAt = lead?.published_at || null;
  const publishedAtSource = isOlxPromotionReference(lead) ? "promotion" : null;

  return {
    ...lead,
    id: lead?.id,
    id_externo: lead?.external_id || null,
    titulo: title || "Sem título",
    imovel: title || "Sem imóvel",
    tipo,
    quartos,
    owner_name: ownerName,
    proprietario: ownerName,
    link: lead?.url || null,
    url: lead?.url || null,
    cidade: city || "N/A",
    freguesia: freguesia || null,
    distrito: district,
    concelho: municipality,
    morada: locationLabel,
    location: locationLabel,
    area: toNullableNumber(lead?.area ?? raw?.area ?? raw?.areaInSquareMeters),
    preco: toNullableNumber(lead?.price ?? raw?.price ?? raw?.totalPrice?.value),
    publicado: lead?.created_at_first || null,
    publicado_em: lead?.created_at_first || null,
    published_at: publishedAt,
    published_at_source: publishedAtSource,
    encontrado_em: lead?.detected_at || dataReferencia,
    detected_at: lead?.detected_at || null,
    created_at_first: lead?.created_at_first || raw?.createdAtFirst || null,
    imported: lead?.imported === true,
    crm_lead_id: lead?.crm_lead_id || null,
    is_private_owner: lead?.is_private_owner === true,
    is_private: lead?.is_private_owner === true,
    is_inactive: lead?.is_inactive === true,
    is_new: lead?.is_new === true,
    provider_last_execution: lead?.provider_last_execution || null,
    score: persistedScore,
    estado,
    origem: providerOrigin || "imovirtual",
    source,
    radarLeadMetadata: {
      provider: source,
      externalId: lead?.external_id || null,
      url: lead?.url || null,
      publisherName: ownerName,
      publishedAt: dataReferencia,
      capturedAt: lead?.detected_at || null,
      score: persistedScore,
      status: lead?.status || null
    }
  };
}

export class RadarRepository {
  constructor(provider = null) {
    this.provider = provider;
  }

  setProvider(provider) {
    this.provider = provider;
  }

  async listOpportunities() {
    let crmOpportunities;

    try {
      crmOpportunities = this.provider ? (await this.provider.listOpportunities()) || [] : [];
      console.log("CRM opportunities:", crmOpportunities.length);
    } catch (error) {
      console.log("Erro CRM:", error?.message || error);
      console.warn("[Radar] Falha ao carregar opportunities CRM:", error);
      crmOpportunities = [];
    }

    const empresaId = await resolveEmpresaId();
    if (!empresaId) {
      console.warn("Operação sem empresa_id");
      return [];
    }

    try {
      const { data: providerLeads, error: providerError } = await supabase
        .from("provider_leads")
        .select("*, empresa_provider_listings!inner(empresa_id,is_active)")
        .eq("empresa_provider_listings.empresa_id", empresaId)
        .eq("empresa_provider_listings.is_active", true)
        .eq("provider_active", true);

      if (providerError) {
        console.log("Erro Provider:", providerError?.message || providerError);
        console.warn("[Radar] Falha ao carregar provider_leads:", providerError);
        return crmOpportunities;
      }

      const importedLeads = providerLeads || [];
      const mappedLeads = importedLeads.map((lead) => mapProviderLeadToOpportunity(lead));
      const filteredLeads = mappedLeads.filter((lead) => lead.estado !== "ignorado");

      const formattedLeads = filteredLeads;

      const merged = [...crmOpportunities, ...formattedLeads];

      return merged;
    } catch (error) {
      console.log("Erro Provider:", error?.message || error);
      console.warn("[Radar] Falha ao carregar provider_leads:", error);
      return crmOpportunities;
    }

  }

  async getSummary(filters = {}) {
    const empresaId = await resolveEmpresaId();
    if (!empresaId) return null;

    const { data, error } = await supabase.rpc("radar_get_summary", {
      p_empresa_id: empresaId,
      p_filters: filters || {}
    });

    if (error) {
      console.warn("[Radar] getSummary error:", error);
      return null;
    }

    const summary = Array.isArray(data) ? data[0] : data;

    return {
      monitorizadas: summary?.monitorizadas ?? 0,
      novas: summary?.novas ?? 0,
      importadas: summary?.importadas ?? 0
    };
  }

  async getPage({ page = 1, pageSize = 20, filters = {}, sort = null } = {}) {
    const empresaId = await resolveEmpresaId();
    if (!empresaId) return { data: [], page, pageSize, total: 0 };

    const { data, error } = await supabase.rpc("radar_get_page", {
      p_empresa_id: empresaId,
      p_page: page,
      p_page_size: pageSize,
      p_filters: filters || {}
    });

    if (error) {
      console.warn("[Radar Repository] getPage error:", error);
      return { data: [], page, pageSize, total: 0 };
    }

    const rows = Array.isArray(data) ? data : [];
    return {
      data: rows.map(mapProviderLeadToOpportunity),
      page,
      pageSize,
      total: rows[0]?.total_count ?? 0
    };
  }

  async getFilterOptions(filters = {}) {
    const empresaId = await resolveEmpresaId();
    if (!empresaId) return { districts: [], cities: [], providers: [] };

    const { data, error } = await supabase.rpc("radar_get_filter_options", {
      p_empresa_id:  empresaId,
      p_district:    (filters.district && filters.district !== "todos")  ? filters.district  : null,
      p_provider:    (filters.provider && filters.provider !== "todos")  ? filters.provider  : null,
      p_estado:      (filters.estado   && filters.estado   !== "todos")  ? filters.estado    : null,
      p_is_private:  filters.is_private_owner ?? null,
      p_date_after:  filters.date_after  ?? null,
      p_date_before: filters.date_before ?? null
    });

    if (error) {
      console.warn("[Radar] getFilterOptions error:", error);
      return { districts: [], cities: [], providers: [] };
    }

    return {
      districts: data?.districts || [],
      cities:    data?.cities    || [],
      providers: data?.providers || []
    };
  }

  async updateProfessionalClassification(opportunityId, empresaId) {
    return applyEmpresaScope(
      supabase
        .from("empresa_provider_listings")
        .update({ is_private_owner_override: false, updated_at: new Date().toISOString() })
        .eq("provider_lead_id", opportunityId)
        .select("provider_lead_id")
        .maybeSingle(),
      empresaId
    );
  }

  async deactivateOpportunity(opportunityId, reason, userId, empresaId) {
    const scopedEmpresaId = empresaId || await resolveEmpresaId();
    if (!scopedEmpresaId) {
      return { data: null, error: new Error("Operação sem empresa_id") };
    }

    return applyEmpresaScope(
      supabase
        .from("empresa_provider_listings")
        .update({
          is_active: false,
          inactive_at: new Date().toISOString(),
          inactive_by: userId || null,
          inactive_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq("provider_lead_id", opportunityId)
        .select("provider_lead_id")
        .maybeSingle(),
      scopedEmpresaId
    );
  }
}

