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
  return "imovirtual";
}

function normalizeProviderEstado(lead) {
  if (lead?.imported === true) return "importado";

  const normalizedStatus = String(lead?.status || "").trim().toLowerCase();
  if (normalizedStatus === "ignored") return "ignorado";

  return "novo";
}

async function fetchAllProviderLeads(baseQuery, pageSize = 1000) {
  const records = [];
  let offset = 0;

  while (true) {
    const { data, error } = await baseQuery
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      return { data: records, error };
    }

    const batch = data || [];
    records.push(...batch);

    if (batch.length < pageSize) {
      return { data: records, error: null };
    }

    offset += pageSize;
  }
}

function mapProviderLeadToOpportunity(lead) {
  const raw = lead?.raw_data || {};
  const title = lead?.title || raw?.title || "";
  const tipo = inferPropertyType(title, lead);
  const quartos = inferRooms(title, lead);
  const dataReferencia = lead?.created_at_first || raw?.createdAtFirst || null;
  const providerOrigin = String(lead?.provider || lead?.origem || lead?.source || raw?.source || "imovirtual").trim().toLowerCase();
  const source = normalizeOpportunitySource(providerOrigin);
  const ownerName = lead?.owner_name || raw?.ownerName || raw?.advertOwner?.name || "N/A";
  const freguesia = lead?.freguesia || raw?.freguesia || raw?.location?.address?.city?.name || "";
  const city = lead?.city || raw?.city || freguesia || "";
  const district = lead?.district || raw?.district || raw?.location?.address?.province?.name || "";
  const municipality = raw?.municipality || raw?.location?.address?.county?.name || lead?.concelho || "";
  const locationLabel = lead?.location || raw?.locationLabel || [city, district].filter(Boolean).join(", ") || "N/A";
  const estado = normalizeProviderEstado(lead);
  const persistedScore = toScore(lead?.score ?? raw?.score ?? 0);

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
    publicado: dataReferencia,
    publicado_em: dataReferencia,
    published_at: dataReferencia,
    encontrado_em: lead?.detected_at || dataReferencia,
    detected_at: lead?.detected_at || null,
    created_at_first: lead?.created_at_first || raw?.createdAtFirst || null,
    imported: lead?.imported === true,
    crm_lead_id: lead?.crm_lead_id || null,
    is_private_owner: lead?.is_private_owner === true,
    is_private: lead?.is_private_owner === true,
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

// Single filter application point — used by both getPage() and getSummary()
function applyRadarFilters(query, filters = {}) {
  const city = filters.city != null ? String(filters.city).trim() : "";
  if (city !== "") query = query.ilike("city", `%${city}%`);

  if (filters.district != null && filters.district !== "todos" && String(filters.district).trim() !== "")
    query = query.eq("district", filters.district);

  if (filters.provider != null && filters.provider !== "todos" && String(filters.provider).trim() !== "")
    query = query.eq("provider", filters.provider);

  if (filters.is_private_owner === true) query = query.eq("is_private_owner", true);
  else if (filters.is_private_owner === false) query = query.eq("is_private_owner", false);

  // Date uses created_at_first — the reference date in mapProviderLeadToOpportunity
  // Falls back to detected_at when created_at_first IS NULL
  if (filters.date_after != null) {
    query = query.or(
      `created_at_first.gte.${filters.date_after},and(created_at_first.is.null,detected_at.gte.${filters.date_after})`
    );
  }
  if (filters.date_before != null) {
    query = query.or(
      `created_at_first.lte.${filters.date_before},and(created_at_first.is.null,detected_at.lte.${filters.date_before})`
    );
  }

  // Estado → physical column mapping (normalizeProviderEstado logic):
  //   imported=true       → "importado"
  //   status='ignored'    → "ignorado"
  //   else                → "novo"
  if (filters.estado === "importado") {
    query = query.eq("imported", true);
  } else if (filters.estado === "novo") {
    query = query.or(
      "and(imported.is.null,status.is.null)," +
      "and(imported.is.null,status.neq.ignored)," +
      "and(imported.eq.false,status.is.null)," +
      "and(imported.eq.false,status.neq.ignored)"
    );
  } else if (filters.estado === "ignorado") {
    query = query.eq("status", "ignored");
  } else {
    // Default: exclude ignored, show novo + importado
    query = query.or("status.is.null,status.neq.ignored");
  }

  return query;
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
        .select("*, empresa_provider_listings!inner(empresa_id)")
        .eq("empresa_provider_listings.empresa_id", empresaId)
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

    // KPIs always show full breakdown — remove estado so scope is not pre-narrowed
    const { estado: _removed, ...scopeFilters } = filters;

    const mkBase = () =>
      supabase
        .from("provider_leads")
        .select("*, empresa_provider_listings!inner(empresa_id)", { count: "exact", head: true })
        .eq("empresa_provider_listings.empresa_id", empresaId)
        .eq("provider_active", true);

    const [
      { count: monitorizadas, error: errMon },
      { count: novas, error: errNovas },
      { count: importadas, error: errImportadas }
    ] = await Promise.all([
      applyRadarFilters(mkBase(), scopeFilters),
      applyRadarFilters(mkBase(), { ...scopeFilters, estado: "novo" }),
      applyRadarFilters(mkBase(), { ...scopeFilters, estado: "importado" })
    ]);

    if (errMon || errNovas || errImportadas) {
      console.warn("[Radar] getSummary error:", errMon || errNovas || errImportadas);
      return null;
    }

    return {
      monitorizadas: monitorizadas ?? 0,
      novas: novas ?? 0,
      importadas: importadas ?? 0
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
}

