import { supabase } from "../supabase.js";
import { auditMutation } from "../modules/audit/services";

const PROVIDER_LEADS_TABLE = "provider_leads";
const NEW_LEAD_STATUS = "new";

function validateLead(lead = {}) {
  if (!lead.provider || typeof lead.provider !== "string") return "O provider é obrigatório.";
  if (!lead.external_id || typeof lead.external_id !== "string") return "O external_id é obrigatório.";
  return null;
}

function auditContext(lead, action) {
  return {
    modulo: "discovery_engine",
    entidade: PROVIDER_LEADS_TABLE,
    entidadeId: lead.id || lead.external_id || null,
    metadata: { action, provider: lead.provider || null, externalId: lead.external_id || null }
  };
}

export async function createLead(lead) {
  const validationError = validateLead(lead);
  if (validationError) return { data: null, error: new Error(validationError) };

  try {
    const payload = { ...lead, status: lead.status || NEW_LEAD_STATUS, detected_at: lead.detected_at || new Date().toISOString() };
    console.info("[ImovirtualSync] supabaseUrl", supabase.supabaseUrl || "indisponível");
    console.info("[ImovirtualSync] tabela", PROVIDER_LEADS_TABLE);
    console.info("[ImovirtualSync] payload insert", payload);
    const result = await auditMutation("create", async () => {
      const response = await supabase.from(PROVIDER_LEADS_TABLE).insert([payload]).select().single();
      console.info("[ImovirtualSync] resultado insert", response);
      console.info("[ImovirtualSync] linhas inseridas", response.data ? 1 : 0);
      if (response.error) {
        console.error("[ImovirtualSync] erro Supabase", response.error);
        throw response.error;
      }
      return response;
    }, auditContext(payload, "create_provider_lead"));
    return { data: result.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function findByExternalId(provider, externalId) {
  if (!provider || !externalId) return { data: null, error: new Error("provider e externalId são obrigatórios.") };
  const { data, error } = await supabase.from(PROVIDER_LEADS_TABLE).select("*")
    .eq("provider", provider).eq("external_id", externalId).maybeSingle();
  return { data: data || null, error: error || null };
}

export async function markAsProcessed(leadId) {
  if (!leadId) return { data: null, error: new Error("leadId é obrigatório.") };
  try {
    const result = await auditMutation("update", async () => {
      const response = await supabase.from(PROVIDER_LEADS_TABLE)
        .update({ status: "processed", updated_at: new Date().toISOString() }).eq("id", leadId).select().single();
      if (response.error) throw response.error;
      return response;
    }, auditContext({ id: leadId }, "process_provider_lead"));
    return { data: result.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function listNewLeads() {
  const { data, error } = await supabase.from(PROVIDER_LEADS_TABLE).select("*")
    .eq("status", NEW_LEAD_STATUS).order("detected_at", { ascending: false });
  return { data: data || [], error: error || null };
}

export async function listImovirtualLeads({ privateOnly, last24Hours, district, minPrice, maxPrice } = {}) {
  let query = supabase.from(PROVIDER_LEADS_TABLE)
    .select("id, external_id, title, price, area, rooms, city, district, owner_name, is_private_owner, url, created_at_first, detected_at, short_description, source, status")
    .eq("provider", "imovirtual")
    .order("created_at_first", { ascending: false, nullsFirst: false });
  if (privateOnly) query = query.eq("is_private_owner", true);
  if (last24Hours) query = query.gte("created_at_first", new Date(Date.now() - 86400000).toISOString());
  if (district) query = query.eq("district", district);
  if (minPrice !== "" && minPrice !== undefined) query = query.gte("price", Number(minPrice));
  if (maxPrice !== "" && maxPrice !== undefined) query = query.lte("price", Number(maxPrice));
  const { data, error } = await query;
  return { data: data || [], error: error || null };
}
