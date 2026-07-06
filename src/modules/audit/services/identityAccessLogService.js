import { supabase } from "../../../supabase";

function getFilterIds(userFilter = null) {
  if (!userFilter) return [];

  const ids = [userFilter.id, userFilter.auth_user_id].filter(Boolean);
  return [...new Set(ids)];
}

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
    createdAt: log.created_at
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
    createdAt: session.last_activity_at || session.login_at || session.updated_at || null
  }));
}

async function fetchNavigationLogs({ page, pageSize, userFilter }) {
  const offset = (page - 1) * pageSize;
  const ids = getFilterIds(userFilter);

  let query = supabase
    .from("logs_navegacao")
    .select("id,usuario_id,acao,detalhes,created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (ids.length === 1) {
    query = query.eq("usuario_id", ids[0]);
  }

  if (ids.length > 1) {
    query = query.or(ids.map((id) => `usuario_id.eq.${id}`).join(","));
  }

  return query;
}

async function fetchAuditLogs({ page, pageSize, userFilter }) {
  const offset = (page - 1) * pageSize;
  const ids = getFilterIds(userFilter);

  let query = supabase
    .from("audit_logs")
    .select("id,user_id,event_type,status,modulo,entidade,metadata,created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (ids.length === 1) {
    query = query.eq("user_id", ids[0]);
  }

  if (ids.length > 1) {
    query = query.or(ids.map((id) => `user_id.eq.${id}`).join(","));
  }

  return query;
}

async function fetchSessionLogs({ page, pageSize, userFilter }) {
  const offset = (page - 1) * pageSize;
  const ids = getFilterIds(userFilter);

  let query = supabase
    .from("user_sessions")
    .select("id,user_id,status,ip_address,user_agent,device,login_at,last_activity_at,logout_at,updated_at")
    .order("last_activity_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (ids.length === 1) {
    query = query.eq("user_id", ids[0]);
  }

  if (ids.length > 1) {
    query = query.or(ids.map((id) => `user_id.eq.${id}`).join(","));
  }

  return query;
}

export async function listarUtilizadoresIdentityAccess() {
  return supabase
    .from("usuarios")
    .select("id,auth_user_id,nome,apelido,email,username")
    .order("nome", { ascending: true });
}

export async function listarTimelineIdentityAccess({ page = 1, pageSize = 50, userFilter = null }) {
  const [navResult, auditResult, sessionResult] = await Promise.all([
    fetchNavigationLogs({ page, pageSize, userFilter }),
    fetchAuditLogs({ page, pageSize, userFilter }),
    fetchSessionLogs({ page, pageSize, userFilter })
  ]);

  const error = navResult.error || auditResult.error || sessionResult.error || null;
  if (error) {
    return { data: [], hasMore: false, error };
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

  return {
    data: merged,
    hasMore,
    error: null
  };
}