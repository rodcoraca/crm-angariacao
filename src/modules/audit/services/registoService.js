import { supabase } from "../../../supabase.js";
import { resolveEmpresaIdFromContext } from "../../../utils/empresaScope.js";

const AUDIT_TABLE = "audit_logs";

const EVENT_TYPES = new Set([
  "create",
  "update",
  "delete",
  "action",
  "login",
  "logout",
  "access_denied",
  "security",
  "system",
  "lead.transfer"
]);

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "") ?? null;
}

function resolveActorId(context = {}) {
  return firstValue(
    context.userId,
    context.utilizadorId,
    context.usuarioId,
    context.actorId
  );
}

function resolveEntity(context = {}) {
  const entity = context.entidade || context.entity || {};
  if (typeof entity === "string") {
    return {
      tipo: entity,
      id: firstValue(context.entidadeId, context.entityId, context.id),
      nome: firstValue(context.entidadeNome, context.entityName)
    };
  }

  return {
    tipo: firstValue(entity.tipo, entity.type, context.entidadeTipo, context.entityType, context.modulo),
    id: firstValue(entity.id, context.entidadeId, context.entityId),
    nome: firstValue(
      entity.nome,
      entity.name,
      context.entidadeNome,
      context.entityName
    )
  };
}

function normalizeChanges(context = {}) {
  if (context.alteracoes && typeof context.alteracoes === "object") {
    return context.alteracoes;
  }

  if (context.changes && typeof context.changes === "object") {
    return context.changes;
  }

  const before = context.before ?? context.metadata?.before;
  const after = context.after ?? context.metadata?.after;

  if (!before && !after) return null;

  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {})
  ]);

  const changes = {};
  keys.forEach((key) => {
    const beforeValue = before?.[key] ?? null;
    const afterValue = after?.[key] ?? null;

    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changes[key] = {
        before: beforeValue,
        after: afterValue
      };
    }
  });

  return Object.keys(changes).length ? changes : null;
}

function normalizeMetadata(context = {}, entity) {
  const metadata = context.metadata && typeof context.metadata === "object"
    ? { ...context.metadata }
    : {};

  const action = firstValue(context.acao, context.action, metadata.action);
  const description = firstValue(
    context.descricao,
    context.description,
    metadata.description
  );
  const changes = normalizeChanges(context);

  delete metadata.before;
  delete metadata.after;
  delete metadata.changes;
  delete metadata.alteracoes;

  return {
    ...metadata,
    action,
    description,
    entity_name: entity.nome,
    before: context.before ?? metadata.before ?? null,
    after: context.after ?? metadata.after ?? null,
    changes
  };
}

export function normalizarRegistoContexto(context = {}) {
  const entity = resolveEntity(context);
  const eventType = firstValue(context.tipo, context.eventType, context.event_type, "action");
  const action = firstValue(context.acao, context.action, context.metadata?.action, eventType);

  if (!EVENT_TYPES.has(eventType)) {
    throw new Error(`Tipo de registo inválido: ${eventType}`);
  }

  if (!entity.tipo && eventType !== "login" && eventType !== "logout" && eventType !== "security") {
    throw new Error("Registo exige entidade.tipo.");
  }

  if (!action) {
    throw new Error("Registo exige ação.");
  }

  return {
    event_type: eventType,
    status: firstValue(context.status, "success"),
    user_id: resolveActorId(context),
    empresa_id: firstValue(context.empresaId, context.empresa_id),
    modulo: firstValue(context.modulo, entity.tipo),
    entidade: entity.tipo,
    entidade_id: entity.id,
    ip_address: firstValue(
      context.ipAddress,
      context.ip,
      context.metadata?.ipAddress,
      context.metadata?.ip
    ),
    user_agent: firstValue(
      context.userAgent,
      context.metadata?.userAgent,
      typeof navigator !== "undefined" ? navigator.userAgent : null
    ),
    metadata: {
      ...normalizeMetadata(context, entity),
      action
    },
    created_at: firstValue(context.createdAt, context.created_at, new Date().toISOString())
  };
}

export async function registrarEvento(context = {}) {
  const empresaId = firstValue(
    context.empresaId,
    context.empresa_id,
    resolveEmpresaIdFromContext(context.currentUser)
  );

  const payload = normalizarRegistoContexto({
    ...context,
    empresaId
  });

  const { data, error } = await supabase
    .from(AUDIT_TABLE)
    .insert([payload])
    .select("id,event_type,status,user_id,empresa_id,modulo,entidade,entidade_id,metadata,created_at")
    .maybeSingle();

  if (error) {
    console.error("Falha ao gravar registo de auditoria", error);
    return { ok: false, data: null, error };
  }

  return { ok: true, data, error: null };
}

export async function listarRegistos({
  currentUser = null,
  page = 1,
  pageSize = 50,
  userId = null,
  modulo = null,
  entidade = null,
  tipo = null,
  dateFrom = null,
  dateTo = null,
  search = null
} = {}) {
  const empresaId = resolveEmpresaIdFromContext(currentUser);
  if (!empresaId) {
    return {
      data: [],
      count: 0,
      hasMore: false,
      error: new Error("empresa_id é obrigatório para consultar Registos.")
    };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 50));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  let query = supabase
    .from(AUDIT_TABLE)
    .select(
      "id,event_type,status,user_id,empresa_id,modulo,entidade,entidade_id,metadata,created_at",
      { count: "exact" }
    )
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (userId) query = query.eq("user_id", userId);
  if (modulo) query = query.eq("modulo", modulo);
  if (entidade) query = query.eq("entidade", entidade);
  if (tipo) query = query.eq("event_type", tipo);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lt("created_at", dateTo);

  if (search) {
    const term = String(search).trim();
    if (term) {
      query = query.or(
        `modulo.ilike.%${term}%,entidade.ilike.%${term}%,metadata->>action.ilike.%${term}%,metadata->>description.ilike.%${term}%,metadata->>entity_name.ilike.%${term}%`
      );
    }
  }

  const { data, count, error } = await query;

  return {
    data: data || [],
    count: count ?? 0,
    hasMore: (data || []).length === safePageSize,
    error: error || null
  };
}
