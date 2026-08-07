import { supabase } from "../../../supabase.js";
import {
  applyEmpresaScope,
  hasEmpresaId,
  resolveEmpresaIdFromContext,
  warnMissingEmpresaId
} from "../../../utils/empresaScope";
function mapNavigationLogs(rows = []) {
  return rows.map((log) => ({
    id: `nav_${log.id}`,
    rawId: log.id,
    source: "logs_navegacao",
    userId: log.usuario_id || null,
    action: log.acao || "navegacao",
    details: log.detalhes || "Sem detalhes",
    createdAt: log.created_at
  }));
}

function mapAuditLogs(rows = []) {
  return rows.map((log) => ({
    id: `audit_${log.id}`,
    rawId: log.id,
    source: "audit_logs",
    userId: log.user_id || null,
    action: log.event_type || "audit",
    details: log.metadata?.action || log.modulo || log.entidade || "Evento de auditoria",
    createdAt: log.created_at,
    raw: log
  }));
}

function mapSessionLogs(rows = []) {
  return rows.map((session) => ({
    id: `session_${session.id}`,
    rawId: session.id,
    source: "user_sessions",
    userId: session.user_id || null,
    action: `session_${session.status || "active"}`,
    details: [
      session.device ? `Dispositivo: ${session.device}` : null,
      session.ip_address ? `IP: ${session.ip_address}` : null,
      session.user_agent ? `Agent: ${session.user_agent}` : null
    ].filter(Boolean).join(" • ") || "Registo de sessão",
    createdAt: session.last_activity_at || session.login_at || session.updated_at || null,
    raw: session
  }));
}

async function fetchNavigationLogs({ page, pageSize, userFilter }) {
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("logs_navegacao")
    .select("id,usuario_id,acao,detalhes,created_at", { count: 'exact' })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (userFilter?.auth_user_id) {
    query = query.eq("usuario_id", userFilter.auth_user_id);
  }

  return query;
}

async function fetchAuditLogs({ page, pageSize, userFilter, empresaId }) {
  const offset = (page - 1) * pageSize;

  let query = applyEmpresaScope(supabase
    .from("audit_logs")
    .select("id,user_id,event_type,status,modulo,entidade,metadata,created_at", { count: 'exact' })
  , empresaId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (userFilter?.auth_user_id) {
    query = query.eq("user_id", userFilter.auth_user_id);
  }

  return query;
}

async function fetchSessionLogs({ page, pageSize, userFilter, empresaId }) {
  const offset = (page - 1) * pageSize;

  let query = applyEmpresaScope(supabase
    .from("user_sessions")
    .select("id,user_id,status,ip_address,user_agent,device,login_at,last_activity_at,logout_at,updated_at", { count: 'exact' })
  , empresaId)
    .order("last_activity_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (userFilter?.auth_user_id) {
    query = query.eq("user_id", userFilter.auth_user_id);
  }

  return query;
}

export async function listarUtilizadoresIdentityAccess({ currentUser = null } = {}) {
  const empresaId = resolveEmpresaIdFromContext(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  return applyEmpresaScope(supabase
    .from("usuarios")
    .select("id,auth_user_id,nome,apelido,email,username"), empresaId)
    .order("nome", { ascending: true });
}

async function listarTimelineIdentityAccess({ page = 1, pageSize = 50, userFilter = null, currentUser = null }) {
  const empresaId = resolveEmpresaIdFromContext(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], hasMore: false, count: 0, error: null };
  }

  const [navResult, auditResult, sessionResult] = await Promise.all([
    fetchNavigationLogs({ page, pageSize, userFilter }),
    fetchAuditLogs({ page, pageSize, userFilter, empresaId }),
    fetchSessionLogs({ page, pageSize, userFilter, empresaId })
  ]);

  const error = navResult.error || auditResult.error || sessionResult.error || null;
  if (error) {
    return { data: [], hasMore: false, count: null, error };
  }

  const merged = [
    ...mapNavigationLogs(navResult.data || []),
    ...mapAuditLogs(auditResult.data || []),
    ...mapSessionLogs(sessionResult.data || [])
  ]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, pageSize);

  const hasMore =
    (navResult.data || []).length === pageSize ||
    (auditResult.data || []).length === pageSize ||
    (sessionResult.data || []).length === pageSize;

  const count = (navResult.count || 0) + (auditResult.count || 0) + (sessionResult.count || 0);

  return {
    data: merged,
    hasMore,
    count,
    error: null
  };
}

export async function listarAtividadeUtilizador({ perfilId = null, authUserId = null, page = 1, pageSize = 50, currentUser = null } = {}) {
  const empresaId = resolveEmpresaIdFromContext(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { sessoes: [], auditoria: [], navegacao: [], counts: { sessoes: 0, auditoria: 0, navegacao: 0 }, error: null };
  }

  const userFilter = (perfilId || authUserId) ? { id: perfilId, auth_user_id: authUserId } : null;

  const [sessionResult, auditResult, navResult] = await Promise.all([
    fetchSessionLogs({ page, pageSize, userFilter, empresaId }),
    fetchAuditLogs({ page, pageSize, userFilter, empresaId }),
    fetchNavigationLogs({ page, pageSize, userFilter }),
  ]);

  const error = sessionResult.error || auditResult.error || navResult.error || null;
  if (error) {
    return { sessoes: [], auditoria: [], navegacao: [], counts: { sessoes: null, auditoria: null, navegacao: null }, error };
  }

  const sessoes = sessionResult.data || [];
  const auditoria = auditResult.data || [];
  const navegacao = navResult.data || [];

  return {
    sessoes,
    auditoria,
    navegacao,
    counts: {
        sessoes: sessionResult.count ?? 0,
        auditoria: auditResult.count ?? 0,
        navegacao: navResult.count ?? 0,
    },
    error: null
  };
}