import { hasPermission as hasCompatiblePermission } from "./legacyPermissionCompatibility";

export const PROTECTED_VIEW_RULES = {
  home: { permission: "crm.view" },
  radar: { permission: "radar.view" },
  fluxo: { permission: "crm.view" },
  dashboard: { permission: "dashboard.view" },
  quente: { permission: "leads.hot.view" },
  morno: { permission: "leads.warm.view" },
  frio: { permission: "leads.cold.view" },
  mensagens: { permission: "messages.view" },
  estoque_np: { permission: "inventory.view" },
  usuarios: { permission: "users.view" },
  logs: { permission: "logs.view" },
  admin_documentacao: { permission: "settings.view" },
  admin_docs_arquitetura: { permission: "docs.architecture.view" },
  admin_docs_banco_dados: { permission: "docs.database.view" },
  admin_docs_roadmap: { permission: "docs.roadmap.view" },
  admin_docs_saas: { permission: "docs.saas.view" },
  admin_docs_seguranca: { permission: "docs.security.view" },
  admin_docs_changelog: { permission: "docs.changelog.view" }
};

export function hasPermission(perfil, requiredPermission) {
  return hasCompatiblePermission(perfil, requiredPermission);
}

export function getRequiredPermission(view) {
  return PROTECTED_VIEW_RULES[view]?.permission || null;
}

function getSessionExpiryTimestamp(context) {
  const direct = context?.session?.expiresAt || context?.session?.expires_at || null;
  if (direct) return new Date(direct).getTime();

  if (typeof window === "undefined") return null;

  const raw =
    window.localStorage.getItem("osflow_session_expires_at") ||
    window.sessionStorage.getItem("osflow_session_expires_at") ||
    null;

  if (!raw) return null;

  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function validateAuthenticatedUser(context) {
  const isValid = Boolean(context?.user?.id);
  return {
    key: "authenticatedUser",
    isValid,
    state: isValid ? "valid" : "invalid",
    message: isValid ? "Utilizador autenticado." : "Utilizador nao autenticado."
  };
}

function validateActiveCompany(context) {
  const empresaId =
    context?.activeCompanyId ||
    context?.perfil?.empresa_id ||
    context?.user?.user_metadata?.empresa_id ||
    null;

  if (empresaId) {
    return {
      key: "activeCompany",
      isValid: true,
      state: "valid",
      message: "Empresa ativa identificada.",
      empresaId
    };
  }

  return {
    key: "activeCompany",
    isValid: true,
    state: "not_configured",
    message: "Empresa ativa ainda nao configurada no contexto atual."
  };
}

function validateSession(context) {
  const expiryTimestamp = getSessionExpiryTimestamp(context);

  if (!expiryTimestamp) {
    return {
      key: "validSession",
      isValid: true,
      state: "not_configured",
      message: "Sessao sem expiracao configurada no contexto atual."
    };
  }

  const isValid = Date.now() < expiryTimestamp;
  return {
    key: "validSession",
    isValid,
    state: isValid ? "valid" : "invalid",
    message: isValid ? "Sessao valida." : "Sessao expirada."
  };
}

function validatePermission(context, requiredPermission) {
  if (!requiredPermission) {
    return {
      key: "requiredPermission",
      isValid: true,
      state: "valid",
      message: "Pagina sem permissao obrigatoria definida."
    };
  }

  const isValid = hasPermission(context?.perfil, requiredPermission);
  return {
    key: "requiredPermission",
    isValid,
    state: isValid ? "valid" : "invalid",
    message: isValid ? "Permissao validada." : "Permissao insuficiente.",
    requiredPermission
  };
}

export function authorizeProtectedView(view, context, options = {}) {
  const rules = PROTECTED_VIEW_RULES[view] || {};
  const strictMode = Boolean(options.strictMode);

  const checks = [
    validateAuthenticatedUser(context),
    validateActiveCompany(context),
    validateSession(context),
    validatePermission(context, rules.permission)
  ];

  const invalidCheck = checks.find((check) => !check.isValid);
  const pendingCheck = checks.find((check) => check.state === "not_configured");

  const allowed = !invalidCheck && !(strictMode && pendingCheck);

  return {
    allowed,
    view,
    checks,
    reason: invalidCheck?.message || (strictMode && pendingCheck ? pendingCheck.message : "Acesso autorizado."),
    requiredPermission: rules.permission || null
  };
}

export function isProtectedView(view) {
  return Boolean(PROTECTED_VIEW_RULES[view]);
}
