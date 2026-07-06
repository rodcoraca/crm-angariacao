import { getAllPermissionDefinitions } from "../modules/auth/services/permissionCatalog";
import { hasPermission, normalizePermissions } from "../modules/auth/services/legacyPermissionCompatibility";

export const MODULOS = getAllPermissionDefinitions().map((permission) => ({
  key: permission.code,
  label: permission.label
}));

export function modulosDisponiveis() {
  return MODULOS.map((modulo) => modulo.key);
}

export function temAcesso(usuario, modulo) {
  if (!usuario) return false;

  return hasPermission(usuario.permissoes, modulo);
}

export function permissoesBase() {
  return MODULOS.reduce((acc, modulo) => {
    acc[modulo.key] = true;
    return acc;
  }, {});
}

export function normalizarPermissoes(permissoes) {
  return normalizePermissions(permissoes);
}
