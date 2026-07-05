import { getAllPermissionDefinitions } from "../modules/auth/services/permissionCatalog";

const LEGACY_PERMISSION_MAP = {
  "crm.view": ["fluxo"],
  "dashboard.view": ["dashboard"],
  "leads.hot.view": ["quente"],
  "leads.warm.view": ["morno"],
  "leads.cold.view": ["frio"],
  "messages.view": ["mensagens"],
  "inventory.view": ["estoque_np"],
  "users.view": ["usuarios"],
  "logs.view": ["logs"],
  "radar.view": ["radar"],
  "settings.view": [
    "admin_docs_arquitetura",
    "admin_docs_banco_dados",
    "admin_docs_roadmap",
    "admin_docs_saas",
    "admin_docs_seguranca",
    "admin_docs_changelog"
  ],
  "docs.architecture.view": ["admin_docs_arquitetura"],
  "docs.database.view": ["admin_docs_banco_dados"],
  "docs.roadmap.view": ["admin_docs_roadmap"],
  "docs.saas.view": ["admin_docs_saas"],
  "docs.security.view": ["admin_docs_seguranca"],
  "docs.changelog.view": ["admin_docs_changelog"]
};

export const MODULOS = getAllPermissionDefinitions().map((permission) => ({
  key: permission.code,
  label: permission.label
}));

export function modulosDisponiveis() {
  return MODULOS.map((modulo) => modulo.key);
}

export function temAcesso(usuario, modulo) {
  if (!usuario) return false;

  if (Boolean(usuario.permissoes?.[modulo])) return true;

  const legacyKeys = LEGACY_PERMISSION_MAP[modulo] || [];
  return legacyKeys.some((legacyKey) => Boolean(usuario.permissoes?.[legacyKey]));
}

export function permissoesBase() {
  return MODULOS.reduce((acc, modulo) => {
    acc[modulo.key] = true;
    return acc;
  }, {});
}

export function normalizarPermissoes(permissoes) {
  const base = permissoesBase();
  const entrada = permissoes || {};

  const normalizadas = Object.keys(base).reduce((acc, key) => {
    acc[key] = Boolean(entrada[key]);

    const legacyKeys = LEGACY_PERMISSION_MAP[key] || [];
    if (!acc[key] && legacyKeys.length) {
      acc[key] = legacyKeys.some((legacyKey) => Boolean(entrada[legacyKey]));
    }

    return acc;
  }, {});

  Object.keys(entrada).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(normalizadas, key)) return;
    normalizadas[key] = Boolean(entrada[key]);
  });

  return normalizadas;
}
