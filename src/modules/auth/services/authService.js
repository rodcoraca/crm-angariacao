import { supabase } from "../../../supabase.js";
import { normalizePermissions } from "./legacyPermissionCompatibility.js";

const USERS_TABLE = "usuarios";
const USER_ROLES_TABLE = "user_roles";
const ROLE_PERMISSIONS_TABLE = "role_permissions";
const PERMISSIONS_TABLE = "permissions";
const USER_PROFILE_SELECT = "id,auth_user_id,nome,apelido,email,telefone,username,ativo,permissoes,empresa_id,created_at,updated_at";

function normalizeIdentifier(identifier) {
  return String(identifier || "").trim();
}

function normalizePermissionKey(permissionCode) {
  return String(permissionCode || "").trim().toLowerCase();
}

export async function resolveLoginEmail(identifier) {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) {
    return { email: "", source: "empty" };
  }

  if (normalized.includes("@")) {
    return { email: normalized.toLowerCase(), source: "direct_email" };
  }

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select("email")
    .ilike("username", normalized)
    .maybeSingle();

  if (error) {
    return { email: normalized, source: "fallback", error };
  }

  return { email: data?.email || normalized, source: data?.email ? "username_lookup" : "fallback" };
}

export async function signInWithPassword({ email, password }) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOutAuthSession() {
  return supabase.auth.signOut();
}

export async function loadUserProfileByAuthUserId(authUserId) {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select(USER_PROFILE_SELECT)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  return { data, error };
}

async function loadRbacPermissionsByAuthUserId(authUserId, empresaId) {
  if (!authUserId) return { data: {}, error: null };

  let rolesQuery = supabase
    .from(USER_ROLES_TABLE)
    .select("role_id,empresa_id")
    .eq("user_id", authUserId);

  if (empresaId) {
    rolesQuery = rolesQuery.or(`empresa_id.is.null,empresa_id.eq.${empresaId}`);
  }

  const { data: userRoles, error: userRolesError } = await rolesQuery;
  if (userRolesError) {
    return { data: {}, error: userRolesError };
  }

  const roleIds = (userRoles || []).map((item) => item?.role_id).filter(Boolean);
  if (!roleIds.length) return { data: {}, error: null };

  const { data: rolePermissions, error: rolePermissionsError } = await supabase
    .from(ROLE_PERMISSIONS_TABLE)
    .select("permission_id")
    .in("role_id", roleIds);

  if (rolePermissionsError) {
    return { data: {}, error: rolePermissionsError };
  }

  const permissionIds = (rolePermissions || []).map((item) => item?.permission_id).filter(Boolean);
  if (!permissionIds.length) return { data: {}, error: null };

  const { data: permissions, error: permissionsError } = await supabase
    .from(PERMISSIONS_TABLE)
    .select("code,is_active")
    .in("id", permissionIds);

  if (permissionsError) {
    return { data: {}, error: permissionsError };
  }

  const permissionMap = (permissions || []).reduce((acc, permission) => {
    if (permission?.is_active === false) return acc;

    const normalizedCode = normalizePermissionKey(permission?.code);
    if (!normalizedCode) return acc;

    acc[normalizedCode] = true;
    return acc;
  }, {});

  return { data: permissionMap, error: null };
}

export async function loadAuthorizationProfileByAuthUserId(authUserId) {
  const { data: profile, error: profileError } = await loadUserProfileByAuthUserId(authUserId);

  if (profileError || !profile) {
    return { data: profile || null, error: profileError || null };
  }

  const normalizedProfilePermissions = normalizePermissions(profile.permissoes || {});
  const { data: rbacPermissions, error: rbacError } = await loadRbacPermissionsByAuthUserId(
    authUserId,
    profile.empresa_id || null
  );

  if (rbacError) {
    return {
      data: {
        ...profile,
        permissoes: normalizedProfilePermissions
      },
      error: rbacError
    };
  }

  const mergedPermissions = {
    ...normalizedProfilePermissions
  };

  Object.entries(rbacPermissions || {}).forEach(([permissionCode, isAllowed]) => {
    if (!isAllowed) return;

    const normalizedCode = normalizePermissionKey(permissionCode);
    if (!normalizedCode) return;

    mergedPermissions[normalizedCode] = true;
  });

  return {
    data: {
      ...profile,
      permissoes: mergedPermissions
    },
    error: null
  };
}

export async function loadUserProfileByLoginEmail(email) {
  const normalizedEmail = normalizeIdentifier(email).toLowerCase();
  if (!normalizedEmail) {
    return {
      data: null,
      error: {
        code: "missing_email",
        message: "Email obrigatorio para carregar perfil."
      }
    };
  }

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select(USER_PROFILE_SELECT)
    .ilike("email", normalizedEmail)
    .maybeSingle();

  return { data, error };
}

export async function requestPasswordReset(email, redirectTo) {
  const normalizedEmail = normalizeIdentifier(email);
  if (!normalizedEmail) {
    return {
      data: null,
      error: {
        code: "missing_email",
        message: "Email obrigatorio para recuperacao de password."
      }
    };
  }

  return supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: redirectTo || undefined
  });
}

export async function createAuthUserFromAdminFlow({ email, password, metadata = {} }) {
  const currentSessionResult = await supabase.auth.getSession();
  const previousSession = currentSessionResult?.data?.session || null;

  const signUpResult = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });

  const createdUser = signUpResult?.data?.user || null;
  const createdSession = signUpResult?.data?.session || null;

  if (!signUpResult.error && previousSession && createdSession?.user?.id !== previousSession?.user?.id) {
    await supabase.auth.setSession({
      access_token: previousSession.access_token,
      refresh_token: previousSession.refresh_token
    });
  }

  return {
    ...signUpResult,
    createdUser
  };
}
