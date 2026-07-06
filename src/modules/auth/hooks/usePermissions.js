import { useMemo } from "react";
import { useAuthContext } from "../context/AuthContext";
import { extractPermissionSet, hasPermission, normalizePermissionCode } from "../services/legacyPermissionCompatibility";

export function usePermissions() {
  const { user, perfil } = useAuthContext();

  const permissions = useMemo(() => extractPermissionSet(perfil?.permissoes), [perfil]);

  const can = useMemo(() => {
    return (permissionCode) => {
      if (!user?.id) return false;

      const normalized = normalizePermissionCode(permissionCode);
      if (!normalized) return false;

      if (permissions.has(normalized)) return true;

      return hasPermission(perfil?.permissoes, normalized);
    };
  }, [permissions, perfil, user]);

  return {
    can,
    permissions
  };
}
