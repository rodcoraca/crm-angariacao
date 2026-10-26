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

export async function resolveLoginEmail(identifier) {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) {
    return { email: "", source: "empty" };
  }

  if (normalized.includes("@")) {
    return { email: normalized.toLowerCase(), source: "direct_email" };
  }

  const { data, error } = await supabase
    .rpc("resolve_login_email", { p_login: normalized });

  if (error) {
    return { email: normalized, source: "fallback", error };
  }

  const foundEmail = data ? String(data).toLowerCase() : null;
  return { email: foundEmail || normalized, source: foundEmail ? "username_lookup" : "fallback" };
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

/*export async function loadUserProfileByAuthUserId(authUserId) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  console.log("ACCESS TOKEN", !!session?.access_token);

  const response = await fetch(
    "https://vtymfigjtczgeyavdujl.supabase.co/rest/v1/usuarios?select=id",
    {
      method: "GET",
      headers: {
        apikey: "sb_publishable_Padg7Bs8OhyGxH0J_JW7sg_R4h5nkLo",
        Authorization: `Bearer ${session.access_token}`
      }
    }
  );

  console.log("STATUS", response.status);

  const text = await response.text();

  console.log("BODY", text);

  return { data: null, error: null };
}*/

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

export function getAppRedirectBaseUrl({
  location = typeof window !== "undefined" ? window.location : null,
  env = typeof process !== "undefined" ? process.env : {}
} = {}) {
  const configuredUrl = String(env?.REACT_APP_APP_URL || "").trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (location?.origin) {
    const hostname = String(location.hostname || "").toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return String(location.origin || "http://localhost:3000").replace(/\/$/, "");
    }

    return String(location.origin).replace(/\/$/, "");
  }

  return "https://app.osflow.pt";
}

const ACTIVATION_REDIRECT_PRODUCTION_HOST = "app.osflow.pt";
const ACTIVATION_REDIRECT_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const ACTIVATION_REDIRECT_LOCAL_PORTS = new Set(["", "3000", "3001"]);

function isAllowedActivationRedirect(url) {
  const hostname = String(url?.hostname || "").toLowerCase();
  const protocol = String(url?.protocol || "").toLowerCase();
  const port = String(url?.port || "");

  if (url?.username || url?.password) return false;
  if (!["http:", "https:"].includes(protocol)) return false;

  if (hostname === ACTIVATION_REDIRECT_PRODUCTION_HOST) {
    return protocol === "https:" && (port === "" || port === "443");
  }

  return ACTIVATION_REDIRECT_LOCAL_HOSTS.has(hostname)
    && ACTIVATION_REDIRECT_LOCAL_PORTS.has(port);
}

export function buildActivationRedirectUrl(redirectTo) {
  const candidate = normalizeIdentifier(redirectTo) || getAppRedirectBaseUrl();
  const url = new URL(candidate);

  if (!isAllowedActivationRedirect(url)) {
    throw new Error("Destino de ativação não autorizado.");
  }

  url.searchParams.set("activation", "1");
  return url.toString();
}

export function resolveTransactionalAuthContext({
  location = typeof window !== "undefined" ? window.location : null,
  search,
  hash
} = {}) {
  const queryString = typeof search === "string" ? search : (location?.search || "");
  const fragmentString = typeof hash === "string" ? hash : (location?.hash || "");
  const searchParams = new URLSearchParams(queryString.startsWith("?") ? queryString.slice(1) : queryString);
  const hashParams = new URLSearchParams(fragmentString.startsWith("#") ? fragmentString.slice(1) : fragmentString);

  const type = String(hashParams.get("type") || searchParams.get("type") || "").toLowerCase();
  const activation = String(hashParams.get("activation") || searchParams.get("activation") || "").toLowerCase();
  const code = String(searchParams.get("code") || hashParams.get("code") || "").trim();
  const accessToken = String(hashParams.get("access_token") || searchParams.get("access_token") || "").trim();
  const refreshToken = String(hashParams.get("refresh_token") || searchParams.get("refresh_token") || "").trim();

  return {
    type,
    activation,
    code,
    accessToken,
    refreshToken,
    isRecovery: (type === "recovery" || type === "invite") || Boolean(code) || Boolean(accessToken && refreshToken),
    isActivation: activation === "1" || activation === "true",
    shouldPrioritizePersistentSession: false
  };
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

export async function sendAccountActivationInvite(email, redirectTo, { nome = "", username = "", empresa = "", usuarioId = "", authUserId = "", empresaId = "" } = {}) {
  const normalizedEmail =
    normalizeIdentifier(email)
      .toLowerCase();

  if (!normalizedEmail) {
    return {
      data: null,
      error: {
        code: "missing_email",
        message:
          "Email obrigatorio para envio de convite de ativacao."
      }
    };
  }

  try {
    const activationRedirectTo = buildActivationRedirectUrl(redirectTo);
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    console.group(
      "sendAccountActivationInvite"
    );

    console.log(
      "EMAIL:",
      normalizedEmail
    );

    console.log(
      "REDIRECT:",
      activationRedirectTo
    );

    console.log(
      "SESSION ERROR:",
      sessionError || null
    );

    console.log(
      "SESSION EXISTS:",
      !!session
    );

    console.log(
      "AUTH USER:",
      session?.user || null
    );

    console.log(
      "AUTH USER ID:",
      session?.user?.id || null
    );

    console.log(
      "AUTH USER EMAIL:",
      session?.user?.email || null
    );

    console.log(
      "ACCESS TOKEN:",
      session?.access_token
        ? "EXISTS"
        : "MISSING"
    );

    const payload = {
      email: normalizedEmail,
      usuarioId: usuarioId || undefined,
      authUserId: authUserId || undefined,
      empresaId: empresaId || undefined,
      redirectTo: activationRedirectTo,
      nome: nome || undefined,
      username: username || undefined,
      empresa: empresa || undefined
    };

    console.log(
      "INVOKE PAYLOAD:",
      payload
    );

    const result =
      await supabase.functions.invoke(
        "send-user-invite",
        {
          body: payload
        }
      );

    const status =
      result?.error?.context
        ?.status ||
      result?.error?.status ||
      null;

    console.log(
      "EDGE STATUS:",
      status
    );

    console.log(
      "EDGE DATA:",
      result?.data || null
    );

    console.log(
      "EDGE ERROR:",
      result?.error || null
    );

    console.groupEnd();

    return result;

  } catch (error) {
    console.error(
      "sendAccountActivationInvite EXCEPTION",
      error
    );

    return {
      data: null,
      error: {
        code:
          "send_invite_exception",
        message:
          error?.message ||
          "Erro inesperado no envio do convite.",
        details: error
      }
    };
  }
}

export async function getAuthUserInviteStatus(email, { usuarioId = "", authUserId = "", empresaId = "" } = {}) {
  const normalizedEmail = normalizeIdentifier(email).toLowerCase();

  if (!normalizedEmail && !usuarioId && !authUserId) {
    return {
      data: null,
      error: {
        code: "missing_email",
        message: "Email obrigatorio para verificar estado de convite."
      }
    };
  }

  const result = await supabase.functions.invoke("send-user-invite", {
    body: {
      email: normalizedEmail,
      usuarioId: usuarioId || undefined,
      authUserId: authUserId || undefined,
      empresaId: empresaId || undefined,
      action: "status"
    }
  });

  if (result.error) {
    return { data: null, error: result.error };
  }

  const payload = result.data || {};
  return {
    data: {
      exists: Boolean(payload.alreadyExists),
      emailConfirmed: Boolean(payload.emailConfirmed),
      user: payload?.data?.user || null
    },
    error: null
  };
}

export async function updateAuthUserEmail({ usuarioId, authUserId, empresaId, email, newEmail }) {
  const normalizedNewEmail = normalizeIdentifier(newEmail || email).toLowerCase();
  if ((!usuarioId && !authUserId) || !normalizedNewEmail) {
    return {
      data: null,
      error: { code: "missing_email_update_context", message: "Identidade Auth e novo email são obrigatórios." }
    };
  }

  const result = await supabase.functions.invoke("send-user-invite", {
    body: {
      action: "update_email",
      usuarioId,
      authUserId,
      empresaId,
      email: normalizedNewEmail,
      newEmail: normalizedNewEmail
    }
  });

  if (result.error) return { data: null, error: result.error };
  if (!result.data?.success) {
    return {
      data: null,
      error: { code: result.data?.error || "auth_email_update_failed", message: result.data?.message || "Falha ao atualizar email no Auth." }
    };
  }

  return { data: result.data?.data?.user || null, error: null };
}

export async function alterarPasswordUtilizador({ authUserId, password }) {
  const normalizedAuthUserId = normalizeIdentifier(authUserId);
  const normalizedPassword = String(password || "");

  if (!normalizedAuthUserId) {
    return {
      data: null,
      error: {
        code: "missing_auth_user_id",
        message: "authUserId obrigatorio para alteração administrativa de password."
      }
    };
  }

  if (!normalizedPassword) {
    return {
      data: null,
      error: {
        code: "missing_password",
        message: "Password obrigatoria para alteração administrativa."
      }
    };
  }

  console.log({
    authUserId: normalizedAuthUserId,
    passwordLength: normalizedPassword?.length
  });

  const result = await supabase.functions.invoke("change-user-password", {
    body: {
      authUserId: normalizedAuthUserId,
      password: normalizedPassword
    }
  });

  console.log(result?.data);
  console.log(result?.error);

  if (result?.error?.context) {
    let edgeErrorBody = null;

    try {
      if (typeof result.error.context.clone === "function") {
        edgeErrorBody = await result.error.context.clone().json();
      } else if (typeof result.error.context.json === "function") {
        edgeErrorBody = await result.error.context.json();
      }
    } catch (_error) {
      edgeErrorBody = null;
    }

    console.log("change-user-password edge error diagnostics", {
      status: result?.error?.context?.status || result?.error?.status || null,
      message: result?.error?.message || null,
      body: edgeErrorBody
    });
  }

  if (result.error) {
    return { data: null, error: result.error };
  }

  if (!result.data?.success) {
    return {
      data: null,
      error: {
        code: result.data?.error || "auth_password_update_failed",
        message: result.data?.message || "Falha ao alterar password no auth.users."
      }
    };
  }

  return { data: result.data?.data || null, error: null };
}

export async function markUserAccountActive(profileId, {
  activationCompleted = false,
  authUserId = "",
  empresaId = ""
} = {}) {
  if (!profileId) {
    return {
      data: null,
      error: {
        code: "missing_profile_id",
        message: "Identificador do perfil obrigatorio para ativacao."
      }
    };
  }

  if (!activationCompleted) {
    return {
      data: null,
      error: {
        code: "activation_not_completed",
        message: "A conta só pode ser ativada após a conclusão do onboarding."
      }
    };
  }

  let query = supabase
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
    .eq("ativo", true)
    .is("activated_at", null);

  if (authUserId) {
    query = query.eq("auth_user_id", authUserId);
  }

  if (empresaId) {
    query = query.eq("empresa_id", empresaId);
  }

  const result = await query.select(USER_PROFILE_SELECT).maybeSingle();

  if (result.error) {
    return result;
  }

  if (!result.data) {
    return {
      data: null,
      error: {
        code: "activation_not_applied",
        message: "A ativação não foi aplicada porque o perfil já não está pendente ou não corresponde ao contexto autenticado."
      }
    };
  }

  return result;
}

// Um login com password só prova onboarding concluído se o email foi confirmado
// depois do último convite enviado (evita ativar contas reativadas sem novo convite).
function hasCompletedInviteEvidence(authUser, profile) {
  const confirmedAt = Date.parse(authUser?.email_confirmed_at || authUser?.confirmed_at || "");
  if (Number.isNaN(confirmedAt)) return false;

  const sentAt = Date.parse(profile?.activation_sent_at || "");
  return Number.isNaN(sentAt) || confirmedAt >= sentAt;
}

export async function reconcilePendingActivation(authUser, profile, {
  onboardingCompleted = false,
  passwordAuthenticated = false
} = {}) {
  if (!authUser?.id) {
    return { data: profile || null, error: null, updated: false };
  }

  if (!profile?.id) {
    return {
      data: null,
      error: {
        code: "missing_profile",
        message: "Perfil de utilizador não encontrado para concluir a ativação."
      },
      updated: false
    };
  }

  const authUserId = normalizeIdentifier(authUser.id);
  const profileAuthUserId = normalizeIdentifier(profile.auth_user_id);
  const authEmpresaId = normalizeIdentifier(authUser.user_metadata?.empresa_id);
  const profileEmpresaId = normalizeIdentifier(profile.empresa_id);
  const accountStatus = String(profile.account_status || "").trim().toLowerCase();
  const emailConfirmed = Boolean(authUser.email_confirmed_at || authUser.confirmed_at);

  if (
    !(onboardingCompleted || (passwordAuthenticated && hasCompletedInviteEvidence(authUser, profile)))
    || !emailConfirmed
    || !profileAuthUserId
    || profileAuthUserId !== authUserId
    || !profileEmpresaId
    || (authEmpresaId && authEmpresaId !== profileEmpresaId)
    || accountStatus !== "pending_activation"
    || profile.ativo === false
    || profile.activated_at
  ) {
    return { data: profile, error: null, updated: false };
  }

  const activationResult = await markUserAccountActive(profile.id, {
    activationCompleted: true,
    authUserId,
    empresaId: profile.empresa_id || ""
  });

  if (activationResult.error) {
    return {
      data: profile,
      error: activationResult.error,
      updated: false
    };
  }

  return {
    data: {
      ...profile,
      ...(activationResult.data || {}),
      account_status: "active",
      ativo: true
    },
    error: null,
    updated: true
  };
}

export async function createAuthUserFromAdminFlow({ email, password, metadata = {}, existingAuthUserId = null }) {
  const normalizedEmail = normalizeIdentifier(email).toLowerCase();

  if (!normalizedEmail) {
    return {
      data: null,
      error: {
        code: "missing_email",
        message: "Email obrigatorio para criacao administrativa de utilizador."
      },
      createdUser: null,
      reusedExistingUser: false,
      inviteSent: false
    };
  }

  // Password de onboarding e definida apenas pelo utilizador via link de convite.
  void password;

  if (existingAuthUserId) {
    return {
      data: {
        user: {
          id: existingAuthUserId,
          email: normalizedEmail,
          user_metadata: metadata
        },
        session: null
      },
      error: null,
      createdUser: {
        id: existingAuthUserId,
        email: normalizedEmail,
        user_metadata: metadata
      },
      reusedExistingUser: true,
      inviteSent: false
    };
  }

  const redirectTo =
  typeof window !== "undefined"
    ? window.location.origin
    : undefined;

  const inviteResult =
    await sendAccountActivationInvite(
      normalizedEmail,
      redirectTo,
      {
        nome: String(metadata?.nome || "").trim(),
        username: String(metadata?.username || "").trim(),
        empresa: String(metadata?.empresa || "").trim()
      }
    );

  const invitePayload = inviteResult.data || null;
  if (!invitePayload?.success) {
    return {
      data: null,
      error: {
        code: "invite_failed",
        message: invitePayload?.error || "Nao foi possivel enviar convite de ativacao."
      },
      createdUser: null,
      reusedExistingUser: false,
      inviteSent: false
    };
  }

  const invitedUser = invitePayload?.data?.user || null;
  if (!invitedUser?.id) {
    return {
      data: null,
      error: {
        code: "missing_invited_user",
        message: "Convite enviado sem retorno do utilizador auth."
      },
      createdUser: null,
      reusedExistingUser: false,
      inviteSent: false
    };
  }

  return {
    data: {
      user: invitedUser,
      session: null
    },
    error: null,
    createdUser: invitedUser,
    reusedExistingUser: false,
    inviteSent: true
  };
}
