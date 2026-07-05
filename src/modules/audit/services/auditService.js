import { supabase } from "../../../supabase";

const AUDIT_TABLE = "audit_logs";

function buildContextPayload(context = {}) {
  return {
    user_id: context.userId || null,
    empresa_id: context.empresaId || null,
    modulo: context.modulo || null,
    entidade: context.entidade || null,
    entidade_id: context.entidadeId || null,
    ip_address: context.ipAddress || null,
    user_agent: context.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : null),
    metadata: context.metadata || {},
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
  return writeAudit("login", "success", context);
}

export async function registrarLogout(context = {}) {
  return writeAudit("logout", "success", context);
}

export async function registrarCriacao(context = {}) {
  return writeAudit("create", "success", context);
}

export async function registrarEdicao(context = {}) {
  return writeAudit("update", "success", context);
}

export async function registrarExclusao(context = {}) {
  return writeAudit("delete", "success", context);
}

export async function registrarAcessoNegado(context = {}) {
  return writeAudit("access_denied", "denied", context);
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
