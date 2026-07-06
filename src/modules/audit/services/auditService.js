import { supabase } from "../../../supabase";
import { finalizeUserSession, registerUserSession } from "../../auth/services/sessionService";
import { signOutAuthSession } from "../../auth/services/authService";

const AUDIT_TABLE = "audit_logs";

function normalizeDetails(context = {}) {
  if (context.detalhes && typeof context.detalhes === "object") return context.detalhes;
  if (context.details && typeof context.details === "object") return context.details;
  if (context.metadata && typeof context.metadata === "object") return context.metadata;
  return {};
}

function normalizeEntity(context = {}) {
  return context.entidade || context.entity || context.modulo || null;
}

function normalizeEntityId(context = {}) {
  return context.entidadeId || context.entityId || context.id || null;
}

function normalizeIpAddress(context = {}) {
  return (
    context.ipAddress ||
    context.ip ||
    context.metadata?.ipAddress ||
    context.metadata?.ip ||
    null
  );
}

function normalizeUserId(context = {}) {
  return context.userId || context.utilizadorId || context.usuarioId || null;
}

function buildContextPayload(context = {}) {
  const detalhes = normalizeDetails(context);

  return {
    user_id: normalizeUserId(context),
    empresa_id: context.empresaId || null,
    modulo: context.modulo || null,
    entidade: normalizeEntity(context),
    entidade_id: normalizeEntityId(context),
    ip_address: normalizeIpAddress(context),
    user_agent: context.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : null),
    metadata: {
      action: context.action || context.acao || null,
      ...detalhes
    },
    created_at: new Date().toISOString()
  };
}

async function writeAudit(eventType, status, context = {}) {
  try {
    const payload = {
      event_type: eventType,
      status,
      ...buildContextPayload(context)
    };

    await supabase.from(AUDIT_TABLE).insert([payload]);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function registrarLogin(context = {}) {
  const normalizedContext = {
    action: "login",
    ...context
  };

  await registerUserSession(normalizedContext);
  return writeAudit("login", "success", normalizedContext);
}

export async function registrarLogout(context = {}) {
  const normalizedContext = {
    action: "logout",
    ...context
  };

  await signOutAuthSession();
  await finalizeUserSession(normalizedContext);
  return writeAudit("logout", "success", normalizedContext);
}

export async function registrarCriacao(context = {}) {
  return writeAudit("create", "success", {
    action: "create",
    ...context
  });
}

export async function registrarEdicao(context = {}) {
  return writeAudit("update", "success", {
    action: "update",
    ...context
  });
}

export async function registrarExclusao(context = {}) {
  return writeAudit("delete", "success", {
    action: "delete",
    ...context
  });
}

export async function registrarAcessoNegado(context = {}) {
  return writeAudit("access_denied", "denied", {
    action: "access_denied",
    ...context
  });
}

export async function auditMutation(eventType, execute, context = {}) {
  try {
    const result = await execute();

    if (eventType === "create") await registrarCriacao(context);
    if (eventType === "update") await registrarEdicao(context);
    if (eventType === "delete") await registrarExclusao(context);

    return result;
  } catch (error) {
    await writeAudit(eventType, "error", {
      ...context,
      metadata: {
        ...(context.metadata || {}),
        error: error?.message || "unknown_error"
      }
    });
    throw error;
  }
}
