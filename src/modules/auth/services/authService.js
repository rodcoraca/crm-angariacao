import { supabase } from "../../../supabase";

const USERS_TABLE = "usuarios";

function normalizeIdentifier(identifier) {
  return String(identifier || "").trim();
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
    .select("id,auth_user_id,nome,apelido,email,telefone,username,ativo,permissoes,empresa_id")
    .eq("auth_user_id", authUserId)
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
