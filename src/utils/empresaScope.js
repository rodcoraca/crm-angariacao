import { supabase } from "../supabase";

const ACTIVE_SESSION_TENANT_KEY = "osflow_active_session_empresa_id";

function normalizeEmpresaId(value) {
  if (value === null || value === undefined) return null;

  const normalized = String(value).trim();
  return normalized || null;
}

export function resolveEmpresaIdFromContext(currentUser) {
  return normalizeEmpresaId(
    currentUser?.empresa_id
    || currentUser?.user_metadata?.empresa_id
    || currentUser?.perfil?.empresa_id
    || null
  );
}

export function buildCurrentUserWithEmpresa(currentUser = null, perfil = null) {
  if (!currentUser) return null;

  const empresaId = normalizeEmpresaId(
    currentUser?.empresa_id
    || currentUser?.user_metadata?.empresa_id
    || perfil?.empresa_id
    || currentUser?.perfil?.empresa_id
    || null
  );

  return {
    ...currentUser,
    empresa_id: empresaId,
    perfil: currentUser?.perfil || perfil || null,
    user_metadata: {
      ...(currentUser?.user_metadata || {}),
      empresa_id: empresaId,
      perfil: perfil?.perfil || currentUser?.user_metadata?.perfil || currentUser?.perfil?.perfil || null
    }
  };
}

export async function resolveEmpresaId(currentUser = null) {
  const fromContext = resolveEmpresaIdFromContext(currentUser);
  if (fromContext) return fromContext;

  if (typeof window !== "undefined") {
    const fromStorage = normalizeEmpresaId(window.localStorage.getItem(ACTIVE_SESSION_TENANT_KEY));
    if (fromStorage) return fromStorage;
  }

  try {
    const { data } = await supabase.auth.getUser();
    return normalizeEmpresaId(data?.user?.user_metadata?.empresa_id);
  } catch {
    return null;
  }
}

export function applyEmpresaScope(query, empresaId) {
  const normalizedEmpresaId = normalizeEmpresaId(empresaId);
  if (!normalizedEmpresaId) return query;
  return query.eq("empresa_id", normalizedEmpresaId);
}

export function buildMissingEmpresaError() {
  const error = new Error("Operacao sem empresa_id");
  error.code = "missing_empresa_id";
  return error;
}

export function warnMissingEmpresaId() {
  console.trace("Operação sem empresa_id");
}

export function hasEmpresaId(empresaId) {
  return Boolean(normalizeEmpresaId(empresaId));
}