import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase";
import {
  buildMissingEmpresaError,
  hasEmpresaId,
  resolveEmpresaId as resolveEmpresaIdFromScope,
  warnMissingEmpresaId
} from "../../utils/empresaScope";

const TenantContext = createContext({
  activeEmpresaId: null,
  activeEmpresa: null,
  loading: false,
  resolveEmpresaId: async () => null,
  requireEmpresaId: async () => null,
  getActiveEmpresa: async () => null
});

export async function resolveEmpresaId(currentUser = null) {
  return resolveEmpresaIdFromScope(currentUser);
}

export async function requireEmpresaId(currentUser = null) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    throw buildMissingEmpresaError();
  }
  return empresaId;
}

export async function getActiveEmpresa(currentUser = null) {
  const empresaId = await resolveEmpresaId(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return null;
  }

  const { data, error } = await supabase
    .from("empresas")
    .select("id,nome,slug,estado,created_at,updated_at")
    .eq("id", empresaId)
    .maybeSingle();

  if (error) {
    console.warn("[TenantContext] Falha ao obter empresa ativa", error);
    return null;
  }

  return data || null;
}

export function TenantProvider({ currentUser, children }) {
  const [activeEmpresa, setActiveEmpresa] = useState(null);
  const [activeEmpresaId, setActiveEmpresaId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function hydrateTenant() {
      setLoading(true);

      try {
        const empresaId = await resolveEmpresaId(currentUser);
        if (!mounted) return;

        setActiveEmpresaId(empresaId || null);

        if (!empresaId) {
          setActiveEmpresa(null);
          return;
        }

        const empresa = await getActiveEmpresa(currentUser);
        if (!mounted) return;
        setActiveEmpresa(empresa || null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    hydrateTenant();

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  const value = useMemo(() => ({
    activeEmpresaId,
    activeEmpresa,
    loading,
    resolveEmpresaId: () => resolveEmpresaId(currentUser),
    requireEmpresaId: () => requireEmpresaId(currentUser),
    getActiveEmpresa: () => getActiveEmpresa(currentUser)
  }), [activeEmpresa, activeEmpresaId, currentUser, loading]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenantContext() {
  return useContext(TenantContext);
}
