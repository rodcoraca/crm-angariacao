import { useMemo } from "react";
import { useAuthContext } from "../context/AuthContext";
import { hasPermission } from "../services";

function normalizePermissionCode(permissionCode) {
  return String(permissionCode || "").trim().toLowerCase();
}

function extractPermissionSet(perfil) {
  const set = new Set();

  const permissoes = perfil?.permissoes;
  if (!permissoes || typeof permissoes !== "object") return set;

  Object.entries(permissoes).forEach(([key, value]) => {
    if (!value) return;
    const normalizedKey = normalizePermissionCode(key);
    if (!normalizedKey) return;

    if (normalizedKey.includes(".")) {
      set.add(normalizedKey);
      return;
    }

    set.add(`${normalizedKey}.view`);

    if (normalizedKey === "fluxo") {
      set.add("crm.create");
    }

    if (["dashboard", "quente", "morno", "frio"].includes(normalizedKey)) {
      set.add("crm.view");
      set.add("agenda.edit");
    }
  });

  return set;
}

export function usePermissions() {
  const { user, perfil } = useAuthContext();

  const permissions = useMemo(() => extractPermissionSet(perfil), [perfil]);

  const can = useMemo(() => {
    return (permissionCode) => {
      if (!user?.id) return false;

      const normalized = normalizePermissionCode(permissionCode);
      if (!normalized) return false;

      if (permissions.has(normalized)) return true;

      return hasPermission(perfil, normalized);
    };
  }, [permissions, perfil, user]);

  return {
    can,
    permissions
  };
}
