import { supabase } from "../../../supabase";

export function fetchLeadsByTipo(tipo) {
  return supabase
    .from("leads")
    .select("id, nome, telefone, tipo, observacoes, agente_id, created_at, updated_at")
    .eq("tipo", tipo)
    .order("created_at", { ascending: false });
}

export function fetchLeadById(leadId) {
  return supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();
}

export function fetchDashboardLeads() {
  return supabase
    .from("leads")
    .select("id, nome, telefone, tipo, created_at, updated_at")
    .order("created_at", { ascending: false });
}

export function fetchLeadByTelefone(telefone) {
  return supabase
    .from("leads")
    .select("id, telefone")
    .eq("telefone", telefone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export function fetchLeadByTelefoneExcludingId(leadId, telefone) {
  return supabase
    .from("leads")
    .select("id, telefone")
    .neq("id", leadId)
    .eq("telefone", telefone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export function fetchLeadAgenteIds() {
  return supabase
    .from("leads")
    .select("agente_id")
    .not("agente_id", "is", null);
}

export function updateLeadById(leadId, payload) {
  return supabase
    .from("leads")
    .update(payload)
    .eq("id", leadId);
}

export function insertLead(payload) {
  return supabase
    .from("leads")
    .insert([payload]);
}

export function fetchAgentesAtivos() {
  return supabase
    .from("agentes")
    .select("id,nome,email,ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });
}
