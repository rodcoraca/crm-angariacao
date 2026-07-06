import { getAllPermissionDefinitions } from "./permissionCatalog";

export const LEGACY_PERMISSION_MAP = {
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
  "docs.changelog.view": ["admin_docs_changelog"],
  "docs.changelog.create": ["admin_docs_changelog"],
  "docs.changelog.edit": ["admin_docs_changelog"],
  "docs.changelog.delete": ["admin_docs_changelog"]
};

const LEGACY_KEY_DERIVED_PERMISSIONS = {
  fluxo: ["crm.view", "crm.create"],
  dashboard: ["dashboard.view", "crm.view", "agenda.edit"],
  quente: ["leads.hot.view", "crm.view", "agenda.edit"],
  morno: ["leads.warm.view", "crm.view", "agenda.edit"],
  frio: ["leads.cold.view", "crm.view", "agenda.edit"]
};

export function getLegacyPermissionKeys(requiredPermission) {
  return LEGACY_PERMISSION_MAP[normalizePermissionCode(requiredPermission)] || [];
}

export function hasLegacyPermission(permissions, requiredPermission) {
  const legacyKeys = getLegacyPermissionKeys(requiredPermission);
  return legacyKeys.some((legacyKey) => Boolean(permissions?.[legacyKey]));
}

export function derivePermissionsFromLegacyKey(legacyKey) {
  const key = normalizePermissionCode(legacyKey);
  if (!key) return [];

  const derived = new Set([`${key}.view`]);
  (LEGACY_KEY_DERIVED_PERMISSIONS[key] || []).forEach((permission) => derived.add(permission));

  return Array.from(derived);
}

export function normalizePermissionCode(permissionCode) {
  return String(permissionCode || "").trim().toLowerCase();
}

export function hasPermission(permissionsOrPerfil, requiredPermission) {
  const permissions = permissionsOrPerfil?.permissoes && typeof permissionsOrPerfil.permissoes === "object"
    ? permissionsOrPerfil.permissoes
    : permissionsOrPerfil || {};

  const normalizedRequiredPermission = normalizePermissionCode(requiredPermission);
  if (!normalizedRequiredPermission) return true;

  if (Boolean(permissions?.[normalizedRequiredPermission])) return true;

  return hasLegacyPermission(permissions, normalizedRequiredPermission);
}

export function extractPermissionSet(permissoes) {
  const set = new Set();
  const entrada = permissoes && typeof permissoes === "object" ? permissoes : {};

  Object.entries(entrada).forEach(([key, value]) => {
    if (!value) return;

    const normalizedKey = normalizePermissionCode(key);
    if (!normalizedKey) return;

    if (normalizedKey.includes(".")) {
      set.add(normalizedKey);
      return;
    }

    derivePermissionsFromLegacyKey(normalizedKey).forEach((permission) => set.add(permission));
  });

  return set;
}

export function normalizePermissions(permissoes) {
  const entrada = permissoes && typeof permissoes === "object" ? permissoes : {};

  const normalizadas = getAllPermissionDefinitions().reduce((acc, permission) => {
    acc[permission.code] = Boolean(entrada[permission.code]);

    if (!acc[permission.code]) {
      const legacyKeys = getLegacyPermissionKeys(permission.code);
      if (legacyKeys.length) {
        acc[permission.code] = legacyKeys.some((legacyKey) => Boolean(entrada[legacyKey]));
      }
    }

    return acc;
  }, {});

  Object.keys(entrada).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(normalizadas, key)) return;
    normalizadas[key] = Boolean(entrada[key]);
  });

  return normalizadas;
}
