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

const LEGACY_PERMISSION_MAP = {
  "crm.view": ["fluxo"],
  "crm.create": ["fluxo"],
  "crm.edit": ["fluxo"],
  "crm.delete": ["fluxo"],
  "dashboard.view": ["dashboard"],
  "dashboard.create": ["dashboard"],
  "dashboard.edit": ["dashboard"],
  "dashboard.delete": ["dashboard"],
  "dashboard.manage": ["dashboard"],
  "leads.hot.view": ["quente"],
  "leads.hot.create": ["quente"],
  "leads.hot.edit": ["quente"],
  "leads.hot.delete": ["quente"],
  "leads.warm.view": ["morno"],
  "leads.warm.create": ["morno"],
  "leads.warm.edit": ["morno"],
  "leads.warm.delete": ["morno"],
  "leads.cold.view": ["frio"],
  "leads.cold.create": ["frio"],
  "leads.cold.edit": ["frio"],
  "leads.cold.delete": ["frio"],
  "messages.view": ["mensagens"],
  "messages.create": ["mensagens"],
  "messages.edit": ["mensagens"],
  "messages.delete": ["mensagens"],
  "inventory.view": ["estoque_np"],
  "inventory.create": ["estoque_np"],
  "inventory.edit": ["estoque_np"],
  "inventory.delete": ["estoque_np"],
  "users.view": ["usuarios"],
  "users.create": ["usuarios"],
  "users.edit": ["usuarios"],
  "users.delete": ["usuarios"],
  "logs.view": ["logs"],
  "logs.create": ["logs"],
  "logs.edit": ["logs"],
  "logs.delete": ["logs"],
  "radar.view": ["radar"],
  "radar.create": ["radar"],
  "radar.edit": ["radar"],
  "radar.delete": ["radar"],
  "settings.view": [
    "admin_docs_arquitetura",
    "admin_docs_banco_dados",
    "admin_docs_roadmap",
    "admin_docs_saas",
    "admin_docs_seguranca",
    "admin_docs_changelog"
  ],
  "settings.create": [
    "admin_docs_arquitetura",
    "admin_docs_banco_dados",
    "admin_docs_roadmap",
    "admin_docs_saas",
    "admin_docs_seguranca",
    "admin_docs_changelog"
  ],
  "settings.edit": [
    "admin_docs_arquitetura",
    "admin_docs_banco_dados",
    "admin_docs_roadmap",
    "admin_docs_saas",
    "admin_docs_seguranca",
    "admin_docs_changelog"
  ],
  "settings.delete": [
    "admin_docs_arquitetura",
    "admin_docs_banco_dados",
    "admin_docs_roadmap",
    "admin_docs_saas",
    "admin_docs_seguranca",
    "admin_docs_changelog"
  ],
  "settings.manage": [
    "admin_docs_arquitetura",
    "admin_docs_banco_dados",
    "admin_docs_roadmap",
    "admin_docs_saas",
    "admin_docs_seguranca",
    "admin_docs_changelog"
  ],
  "docs.architecture.view": ["admin_docs_arquitetura"],
  "docs.architecture.create": ["admin_docs_arquitetura"],
  "docs.architecture.edit": ["admin_docs_arquitetura"],
  "docs.architecture.delete": ["admin_docs_arquitetura"],
  "docs.database.view": ["admin_docs_banco_dados"],
  "docs.database.create": ["admin_docs_banco_dados"],
  "docs.database.edit": ["admin_docs_banco_dados"],
  "docs.database.delete": ["admin_docs_banco_dados"],
  "docs.roadmap.view": ["admin_docs_roadmap"],
  "docs.roadmap.create": ["admin_docs_roadmap"],
  "docs.roadmap.edit": ["admin_docs_roadmap"],
  "docs.roadmap.delete": ["admin_docs_roadmap"],
  "docs.saas.view": ["admin_docs_saas"],
  "docs.saas.create": ["admin_docs_saas"],
  "docs.saas.edit": ["admin_docs_saas"],
  "docs.saas.delete": ["admin_docs_saas"],
  "docs.security.view": ["admin_docs_seguranca"],
  "docs.security.create": ["admin_docs_seguranca"],
  "docs.security.edit": ["admin_docs_seguranca"],
  "docs.security.delete": ["admin_docs_seguranca"],
  "docs.changelog.view": ["admin_docs_changelog"]
  ,"docs.changelog.create": ["admin_docs_changelog"]
  ,"docs.changelog.edit": ["admin_docs_changelog"]
  ,"docs.changelog.delete": ["admin_docs_changelog"]
};

export function hasPermission(perfil, requiredPermission) {
  if (!requiredPermission) return true;

  const permissions = perfil?.permissoes || {};

  if (Boolean(permissions[requiredPermission])) return true;

  const legacyPermissions = LEGACY_PERMISSION_MAP[requiredPermission] || [];
  if (legacyPermissions.some((legacyKey) => Boolean(permissions[legacyKey]))) return true;

  return false;
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
