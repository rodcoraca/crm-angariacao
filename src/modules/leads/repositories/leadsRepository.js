import { supabase } from "../../../supabase";
import { applyEmpresaScope } from "../../../utils/empresaScope.js";

export function fetchLeadsByTipo(tipo, empresaId = null) {
  return applyEmpresaScope(supabase
    .from("leads")
    .select("id, nome, telefone, tipo, observacoes, agente_id, created_at, updated_at")
    .eq("tipo", tipo), empresaId)
    .order("created_at", { ascending: false });
}

export function fetchLeadById(leadId, empresaId = null) {
  return applyEmpresaScope(supabase
    .from("leads")
    .select("*")
    .eq("id", leadId), empresaId)
    .single();
}

export function fetchDashboardLeads(empresaId = null) {
  return applyEmpresaScope(supabase
    .from("leads")
    .select("id, nome, telefone, tipo, created_at, updated_at"), empresaId)
    .order("created_at", { ascending: false });
}

export function fetchLeadByTelefone(telefone, empresaId = null) {
  return applyEmpresaScope(supabase
    .from("leads")
    .select("id, telefone")
    .eq("telefone", telefone), empresaId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export function fetchLeadByTelefoneExcludingId(leadId, telefone, empresaId = null) {
  return applyEmpresaScope(supabase
    .from("leads")
    .select("id, telefone")
    .neq("id", leadId)
    .eq("telefone", telefone), empresaId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export function fetchLeadAgenteIds(empresaId = null) {
  return applyEmpresaScope(supabase
    .from("leads")
    .select("agente_id")
    .not("agente_id", "is", null), empresaId);
}

export function updateLeadById(leadId, payload, empresaId = null) {
  return applyEmpresaScope(supabase
    .from("leads")
    .update(payload)
    .eq("id", leadId), empresaId);
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
