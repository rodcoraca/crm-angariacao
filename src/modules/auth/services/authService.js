import { supabase } from "../../../supabase.js";
import { normalizePermissions } from "./legacyPermissionCompatibility.js";

const USERS_TABLE = "usuarios";
const USER_ROLES_TABLE = "user_roles";
const ROLE_PERMISSIONS_TABLE = "role_permissions";
const PERMISSIONS_TABLE = "permissions";
const AUDIT_TABLE = "audit_logs";
const USER_PROFILE_SELECT = "id,auth_user_id,nome,apelido,email,telefone,username,ativo,account_status,activation_sent_at,activated_at,disabled_at,permissoes,empresa_id,created_at,updated_at";

function normalizeIdentifier(identifier) {
  return String(identifier || "").trim();
}

function normalizePermissionKey(permissionCode) {
  return String(permissionCode || "").trim().toLowerCase();
}

function isDiagnosticFunctionMissing(error) {
  if (!error) return false;

  const code = String(error.code || "").toUpperCase();
  const message = String(error.message || "").toLowerCase();

  return code === "PGRST202"
    || code === "42883"
    || message.includes("could not find the function public.listar_utilizadores_inconsistentes")
    || message.includes("function public.listar_utilizadores_inconsistentes");
}

function normalizeAuthUserRef(authUserOrId) {
  if (authUserOrId && typeof authUserOrId === "object") {
    return {
      authUser: authUserOrId,
      authUserId: normalizeIdentifier(authUserOrId.id),
      authUserEmail: normalizeIdentifier(authUserOrId.email).toLowerCase()
    };
  }

  return {
    authUser: null,
    authUserId: normalizeIdentifier(authUserOrId),
    authUserEmail: ""
  };
}

function buildTemporaryPassword() {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  return `Tmp@${suffix}`;
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

//export async function loadUserProfileByAuthUserId(authUserId) {
export async function loadUserProfileByAuthUserId(authUserId) {
  console.log(
    "loadUserProfileByAuthUserId",
    authUserId
  );

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select(USER_PROFILE_SELECT)
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  
    console.log("PROFILE RESULT", data);
    console.log("PROFILE ERROR", error);
  return { data, error };
}

async function rebindUserProfileAuthUserId(profileId, authUserId) {
  if (!profileId || !authUserId) {
    return {
      data: null,
      error: {
        code: "missing_rebind_context",
        message: "Perfil e auth user obrigatorios para reconciliar auth_user_id."
      }
    };
  }

  return supabase
    .from(USERS_TABLE)
    .update({
      auth_user_id: authUserId,
      updated_at: new Date().toISOString()
    })
    .eq("id", profileId)
    .select(USER_PROFILE_SELECT)
    .maybeSingle();
}

async function writeAuthUserReconciliationAudit({ profile, previousAuthUserId, nextAuthUserId, authUserEmail }) {
  try {
    const payload = {
      event_type: "update",
      status: "success",
      user_id: profile?.id || nextAuthUserId || null,
      empresa_id: profile?.empresa_id || null,
      modulo: "auth",
      entidade: "usuarios",
      entidade_id: profile?.id || null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      metadata: {
        action: "reconcile_auth_user_id",
        previousAuthUserId: previousAuthUserId || null,
        nextAuthUserId: nextAuthUserId || null,
        email: authUserEmail || profile?.email || null
      },
      created_at: new Date().toISOString()
    };

    const result = await supabase
      .from(AUDIT_TABLE)
      .insert([payload]);

    if (result.error) {
      console.error("auth_user_id reconciliation audit error", result.error);
    }
  } catch (error) {
    console.error("auth_user_id reconciliation audit exception", error);
  }
}

function buildAuthUserIdByEmailMap(inconsistencies = []) {
  return (inconsistencies || []).reduce((acc, row) => {
    const email = normalizeIdentifier(row?.email_auth).toLowerCase();
    const authUserId = normalizeIdentifier(row?.auth_user_id);

    if (!email || !authUserId) {
      return acc;
    }

    acc.set(email, authUserId);
    return acc;
  }, new Map());
}

function buildRepairCandidates(users = [], inconsistencies = []) {
  const inconsistentUserIds = new Set(
    (inconsistencies || [])
      .map((row) => normalizeIdentifier(row?.usuario_id))
      .filter(Boolean)
  );

  return (users || []).filter((user) => {
    const userId = normalizeIdentifier(user?.id);
    const hasEmail = Boolean(normalizeIdentifier(user?.email));
    const hasMissingAuthUser = !normalizeIdentifier(user?.auth_user_id);

    return hasEmail && (hasMissingAuthUser || inconsistentUserIds.has(userId));
  });
}

export async function repairUserAuthAssociations({ users = [] } = {}) {
  const candidates = Array.isArray(users) ? users : [];
  if (!candidates.length) {
    return { data: { repairedCount: 0, repairedUserIds: [] }, error: null };
  }

  const diagnosticResult = await supabase.rpc("listar_utilizadores_inconsistentes");
  if (isDiagnosticFunctionMissing(diagnosticResult.error)) {
    return {
      data: { repairedCount: 0, repairedUserIds: [] },
      error: {
        code: "diagnostic_function_missing",
        message: "Diagnostico indisponivel: migração DB-023 não aplicada."
      }
    };
  }

  if (diagnosticResult.error) {
    return { data: { repairedCount: 0, repairedUserIds: [] }, error: diagnosticResult.error };
  }

  const authUserIdByEmail = buildAuthUserIdByEmailMap(diagnosticResult.data || []);
  const repairCandidates = buildRepairCandidates(candidates, diagnosticResult.data || []);
  const repairedUserIds = [];

  for (const user of repairCandidates) {
    const normalizedEmail = normalizeIdentifier(user?.email).toLowerCase();
    const nextAuthUserId = authUserIdByEmail.get(normalizedEmail);
    const previousAuthUserId = normalizeIdentifier(user?.auth_user_id);

    if (!normalizedEmail || !nextAuthUserId || previousAuthUserId === nextAuthUserId) {
      continue;
    }

    const rebindResult = await rebindUserProfileAuthUserId(user.id, nextAuthUserId);
    if (rebindResult.error) {
      console.error("repairUserAuthAssociations.rebindUserProfileAuthUserId", rebindResult.error);
      continue;
    }

    await writeAuthUserReconciliationAudit({
      profile: rebindResult.data || user,
      previousAuthUserId: previousAuthUserId || null,
      nextAuthUserId,
      authUserEmail: normalizedEmail
    });

    repairedUserIds.push(String(user.id));
  }

  return {
    data: {
      repairedCount: repairedUserIds.length,
      repairedUserIds
    },
    error: null
  };
}

async function reconcileOrphanedAuthUserProfile(authUser, profile) {
  if (!authUser?.id || !profile?.id) {
    return { data: profile || null, error: null, updated: false };
  }

  if (String(profile.auth_user_id || "") === String(authUser.id)) {
    return { data: profile, error: null, updated: false };
  }

  const rebindResult = await rebindUserProfileAuthUserId(profile.id, authUser.id);
  if (rebindResult.error) {
    console.error("rebindUserProfileAuthUserId", rebindResult.error);
    return {
      data: {
        ...profile,
        auth_user_id: authUser.id
      },
      error: null,
      updated: false
    };
  }

  await writeAuthUserReconciliationAudit({
    profile: rebindResult.data || profile,
    previousAuthUserId: profile.auth_user_id || null,
    nextAuthUserId: authUser.id,
    authUserEmail: authUser.email || null
  });

  return {
    data: rebindResult.data || {
      ...profile,
      auth_user_id: authUser.id
    },
    error: null,
    updated: true
  };
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

export async function loadAuthorizationProfileByAuthUserId(authUserOrId) {
  const { authUser, authUserId, authUserEmail } = normalizeAuthUserRef(authUserOrId);
  const { data: profile, error: profileError } = await loadUserProfileByAuthUserId(authUserId);

  let resolvedProfile = profile || null;

  if (!resolvedProfile && !profileError && authUserEmail) {
    const { data: profileByEmail, error: emailLookupError } = await loadUserProfileByLoginEmail(authUserEmail);

    if (emailLookupError) {
      return { data: null, error: emailLookupError };
    }

    if (profileByEmail) {
      const reconciliationResult = await reconcileOrphanedAuthUserProfile(authUser || { id: authUserId, email: authUserEmail }, profileByEmail);
      resolvedProfile = reconciliationResult.data || profileByEmail;
    }
  }

  if (profileError || !resolvedProfile) {
    return { data: resolvedProfile || null, error: profileError || null };
  }

  const normalizedProfilePermissions = normalizePermissions(resolvedProfile.permissoes || {});
  const { data: rbacPermissions, error: rbacError } = await loadRbacPermissionsByAuthUserId(
    authUserId,
    resolvedProfile.empresa_id || null
  );

  if (rbacError) {
    return {
      data: {
        ...resolvedProfile,
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
      ...resolvedProfile,
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

export async function sendAccountActivationInvite(email, redirectTo) {
  const normalizedEmail = normalizeIdentifier(email);
  if (!normalizedEmail) {
    return {
      data: null,
      error: {
        code: "missing_email",
        message: "Email obrigatorio para envio de convite de ativacao."
      }
    };
  }

  return supabase.functions.invoke("send-user-invite", {
    body: {
      email: normalizedEmail,
      redirectTo: redirectTo || undefined
    }
  });
}

export async function markUserAccountActive(profileId) {
  if (!profileId) {
    return {
      data: null,
      error: {
        code: "missing_profile_id",
        message: "Identificador do perfil obrigatorio para ativacao."
      }
    };
  }

  return supabase
    .from(USERS_TABLE)
    .update({
      account_status: "active",
      activated_at: new Date().toISOString(),
      disabled_at: null,
      ativo: true,
      updated_at: new Date().toISOString()
    })
    .eq("id", profileId)
    .eq("account_status", "pending_activation")
    .select("id,account_status,activated_at")
    .maybeSingle();
}

function isEmailConfirmed(authUser) {
  return Boolean(authUser?.email_confirmed_at || authUser?.confirmed_at);
}

export async function reconcilePendingActivation(authUser, profile) {
  if (!authUser?.id || !profile?.id) {
    return { data: profile || null, error: null, updated: false };
  }

  const accountStatus = String(profile?.account_status || "").trim().toLowerCase();
  if (accountStatus !== "pending_activation" || !isEmailConfirmed(authUser)) {
    return { data: profile, error: null, updated: false };
  }

  const activationResult = await markUserAccountActive(profile.id);
  if (activationResult.error) {
    return { data: profile, error: activationResult.error, updated: false };
  }

  return {
    data: {
      ...profile,
      account_status: "active",
      activated_at: activationResult.data?.activated_at || new Date().toISOString(),
      disabled_at: null,
      ativo: true
    },
    error: null,
    updated: true
  };
}

export async function createAuthUserFromAdminFlow({ email, password, metadata = {}, existingAuthUserId = null }) {
  const currentSessionResult = await supabase.auth.getSession();
  const previousSession = currentSessionResult?.data?.session || null;
  const normalizedEmail = normalizeIdentifier(email).toLowerCase();
  const resolvedPassword = normalizeIdentifier(password) || buildTemporaryPassword();

  if (existingAuthUserId) {
    return {
      data: {
        user: {
          id: existingAuthUserId,
          email: normalizedEmail,
          user_metadata: metadata
        },
        session: previousSession
      },
      error: null,
      createdUser: {
        id: existingAuthUserId,
        email: normalizedEmail,
        user_metadata: metadata
      },
      reusedExistingUser: true
    };
  }

  const signUpResult = await supabase.auth.signUp({
    email: normalizedEmail,
    password: resolvedPassword,
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
    createdUser,
    reusedExistingUser: false
  };
}
