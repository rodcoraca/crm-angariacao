import { supabase } from "../../../supabase.js";

const PROVIDER_LEADS_TABLE = "provider_leads";
const MATURITY_DAYS = [45, 60];

function getMarketStart(row) {
  return row?.created_at_first || row?.market_first_seen_at || row?.detected_at || null;
}

export function getDaysOnMarket(row, now = new Date()) {
  const start = getMarketStart(row);
  if (!start) return null;
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return null;
  const diff = now.getTime() - startDate.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

export function getMaturityBand(days) {
  if (days == null) return "sem_data";
  if (days < MATURITY_DAYS[0]) return "menos_45";
  if (days < MATURITY_DAYS[1]) return "45_59";
  return "60_mais";
}

export function getMaturityLabel(days) {
  const band = getMaturityBand(days);
  if (band === "45_59") return "45 dias";
  if (band === "60_mais") return "60+ dias";
  if (band === "menos_45") return "< 45 dias";
  return "Sem data";
}

export function getResearchLabel(status) {
  const labels = {
    active: "Ativo",
    changed: "Alterado",
    removed: "Removido",
    error: "Erro",
    running: "A pesquisar",
    pending: "Pendente"
  };
  return labels[status] || "Por pesquisar";
}

export async function listCacadorImoveis({ band = "all", privateOnly = false, provider = "imovirtual" } = {}) {
  let query = supabase
    .from(PROVIDER_LEADS_TABLE)
    .select("id, external_id, provider, title, price, area, rooms, city, district, owner_name, is_private_owner, url, created_at_first, detected_at, market_first_seen_at, modified_at, status, raw_data, cacador_last_research_at, cacador_research_status, cacador_research_data, cacador_research_error")
    .eq("provider", provider)
    .not("created_at_first", "is", null)
    .order("created_at_first", { ascending: true });

  if (privateOnly) query = query.eq("is_private_owner", true);

  const { data, error } = await query;
  if (error) return { data: [], error };

  const rows = (data || []).map((row) => {
    const days = getDaysOnMarket(row);
    return { ...row, days_on_market: days, maturity_band: getMaturityBand(days) };
  });

  return {
    data: band === "all" ? rows : rows.filter((row) => row.maturity_band === band),
    error: null
  };
}

export async function requestCacadorResearch(id) {
  if (!id) return { data: null, error: new Error("ID do imóvel é obrigatório.") };
  const { data, error } = await supabase.functions.invoke("cacador-research", { body: { id } });
  return { data: data || null, error: error || null };
}
