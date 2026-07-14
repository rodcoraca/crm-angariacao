import { supabase } from "../../../supabase";
import { applyEmpresaScope, resolveEmpresaIdFromContext } from "../../../utils/empresaScope.js";

const SEARCH_LIMIT = 8;

function normalizeSearchTerm(term) {
  return String(term || "").trim();
}

function normalizePhoneTerm(term) {
  return String(term || "").replace(/\D/g, "");
}

function buildIlikeOrFilter(fields, term) {
  const normalized = normalizeSearchTerm(term);
  if (!normalized) return "";

  return fields
    .map((field) => `${field}.ilike.%${normalized}%`)
    .join(",");
}

function buildCompanyLabel(companyName) {
  const normalized = normalizeSearchTerm(companyName);
  return normalized || "OSFlow";
}

function computeMatchScore(searchTerm, fields = []) {
  const normalizedTerm = normalizeSearchTerm(searchTerm).toLowerCase();
  const phoneTerm = normalizePhoneTerm(searchTerm);

  if (!normalizedTerm && !phoneTerm) return 0;

  return fields.reduce((score, field, index) => {
    const rawValue = String(field || "").trim();
    if (!rawValue) return score;

    const normalizedValue = rawValue.toLowerCase();
    if (normalizedValue.startsWith(normalizedTerm) && normalizedTerm) {
      return score + (index === 0 ? 120 : 80);
    }

    if (normalizedValue.includes(normalizedTerm) && normalizedTerm) {
      return score + (index === 0 ? 80 : 40);
    }

    const digits = rawValue.replace(/\D/g, "");
    if (phoneTerm && digits.includes(phoneTerm)) {
      return score + 60;
    }

    return score;
  }, 0);
}

function buildLeadTypeLabel(status) {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  if (normalizedStatus === "fechado") return "Cliente";
  if (normalizedStatus && normalizedStatus !== "novo") return "Negócio";
  return "Lead";
}

function buildLeadSecondary(row) {
  const parts = [row?.telefone, row?.origem, row?.status].filter(Boolean);
  return parts.join(" · ") || "Sem detalhe adicional";
}

function buildImovelTitle(row) {
  const primary = [row?.tipologia, row?.zona].filter(Boolean).join(" ").trim();
  if (primary) return primary;
  return row?.proprietario || row?.morada || "Imóvel";
}

function buildImovelSecondary(row) {
  const parts = [row?.proprietario, row?.telefone, row?.email, row?.concelho || row?.distrito].filter(Boolean);
  return parts.join(" · ") || "Sem detalhe adicional";
}

function buildUserTitle(row) {
  return `${row?.nome || ""} ${row?.apelido || ""}`.trim() || row?.username || row?.email || "Utilizador";
}

function buildUserSecondary(row) {
  const parts = [row?.email, row?.telefone, row?.username].filter(Boolean);
  return parts.join(" · ") || "Sem detalhe adicional";
}

function mapLeadResult(row, companyName, searchTerm) {
  const type = buildLeadTypeLabel(row?.status);
  const title = String(row?.nome || "").trim() || type;
  return {
    id: `lead-${row.id}`,
    targetId: row.id,
    targetType: "lead",
    icon: type === "Cliente" ? "🤝" : type === "Negócio" ? "💼" : "👤",
    type,
    title,
    company: buildCompanyLabel(companyName),
    secondary: buildLeadSecondary(row),
    score: computeMatchScore(searchTerm, [title, row?.telefone, row?.origem, row?.status, row?.observacoes])
  };
}

function mapImovelResult(row, companyName, searchTerm) {
  const title = buildImovelTitle(row);
  return {
    id: `imovel-${row.id}`,
    targetId: row.id,
    targetType: "imovel",
    icon: "🏠",
    type: "Imóvel",
    title,
    company: buildCompanyLabel(companyName),
    secondary: buildImovelSecondary(row),
    score: computeMatchScore(searchTerm, [title, row?.proprietario, row?.telefone, row?.email, row?.morada, row?.concelho, row?.distrito])
  };
}

function mapUserResult(row, companyName, searchTerm) {
  const title = buildUserTitle(row);
  return {
    id: `user-${row.id}`,
    targetId: row.id,
    targetType: "user",
    icon: "🧑",
    type: "Utilizador",
    title,
    company: buildCompanyLabel(companyName),
    secondary: buildUserSecondary(row),
    score: computeMatchScore(searchTerm, [title, row?.email, row?.telefone, row?.username])
  };
}

async function searchLeads(term, empresaId, companyName) {
  const orFilter = buildIlikeOrFilter(["nome", "telefone", "origem", "status", "observacoes"], term);
  let query = applyEmpresaScope(
    supabase
      .from("leads")
      .select("id,nome,telefone,tipo,status,origem,observacoes,empresa_id")
      .order("updated_at", { ascending: false })
      .limit(SEARCH_LIMIT),
    empresaId
  );

  if (orFilter) {
    query = query.or(orFilter);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || [])
    .map((row) => mapLeadResult(row, companyName, term))
    .filter((row) => row.score > 0);
}

async function searchImoveis(term, empresaId, companyName) {
  const orFilter = buildIlikeOrFilter(["proprietario", "telefone", "email", "tipologia", "zona", "morada", "concelho", "distrito"], term);
  let query = applyEmpresaScope(
    supabase
      .from("estoque_nao_publicitado")
      .select("id,proprietario,telefone,email,tipologia,zona,morada,concelho,distrito,empresa_id")
      .order("updated_at", { ascending: false })
      .limit(SEARCH_LIMIT),
    empresaId
  );

  if (orFilter) {
    query = query.or(orFilter);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || [])
    .map((row) => mapImovelResult(row, companyName, term))
    .filter((row) => row.score > 0);
}

async function searchUsers(term, empresaId, companyName) {
  const orFilter = buildIlikeOrFilter(["nome", "apelido", "email", "telefone", "username"], term);
  let query = applyEmpresaScope(
    supabase
      .from("usuarios")
      .select("id,nome,apelido,email,telefone,username,empresa_id")
      .order("updated_at", { ascending: false })
      .limit(SEARCH_LIMIT),
    empresaId
  );

  if (orFilter) {
    query = query.or(orFilter);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || [])
    .map((row) => mapUserResult(row, companyName, term))
    .filter((row) => row.score > 0);
}

export async function searchCockpitGlobal({ term, currentUser, canViewUsers = false, companyName = "OSFlow" }) {
  const normalizedTerm = normalizeSearchTerm(term);
  if (normalizedTerm.length < 2) {
    return { data: [], error: null };
  }

  const empresaId = resolveEmpresaIdFromContext(currentUser);
  const tasks = [
    searchLeads(normalizedTerm, empresaId, companyName),
    searchImoveis(normalizedTerm, empresaId, companyName)
  ];

  if (canViewUsers) {
    tasks.push(searchUsers(normalizedTerm, empresaId, companyName));
  }

  try {
    const groups = await Promise.all(tasks);
    const results = groups
      .flat()
      .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, "pt-PT"))
      .slice(0, SEARCH_LIMIT);

    return { data: results, error: null };
  } catch (error) {
    return { data: [], error };
  }
}