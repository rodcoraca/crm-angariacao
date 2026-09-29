import { supabase } from "../../../supabase";
import {
  applyEmpresaScope,
  buildMissingEmpresaError,
  hasEmpresaId,
  resolveEmpresaIdFromContext,
  warnMissingEmpresaId
} from "../../../utils/empresaScope.js";
import { normalizarPermissoes } from "../../../utils/usuarios";
import { registrarAcessoNegado, registrarCriacao, registrarEdicao } from "../../audit/services";
import {
  alterarPasswordUtilizador,
  createAuthUserFromAdminFlow,
  getAuthUserInviteStatus,
  repairUserAuthAssociations,
  requestPasswordReset,
  sendAccountActivationInvite,
  updateAuthUserEmail
} from "../../auth/services";
import { fetchUserPreferencesByUserId, upsertUserPreferencesByUserId } from "../repositories";

const USERS_TABLE = "usuarios";
const USER_LIST_BASE_SELECT = "id,auth_user_id,nome,apelido,email,telefone,username,ativo,account_status,activation_sent_at,activated_at,disabled_at,permissoes,empresa_id,created_at,updated_at";
const ADMIN_PASSWORD_MIN_LENGTH = 8;

function resolveActorUserId(currentUser) {
  return currentUser?.perfil_id || currentUser?.id || null;
}

function normalizeEmpresaId(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function resolveEmpresaIdForUserWrite({ currentUser, form, permissoesAtuais = {} }) {
  const empresaIdFromAuthenticatedContext = resolveEmpresaIdFromContext(currentUser);
  if (empresaIdFromAuthenticatedContext) {
    return empresaIdFromAuthenticatedContext;
  }

  // Admin global pode selecionar empresa sem alterar UX atual.
  const empresaIdFromSelection = normalizeEmpresaId(
    form?.empresa_id
    || form?.permissoes?.empresa_id
    || permissoesAtuais?.empresa_id
  );

  return empresaIdFromSelection;
}

function applyUserFilter(query, { perfilId, authUserId }) {
  if (perfilId && authUserId) {
    return query.or(`user_id.eq.${perfilId},user_id.eq.${authUserId}`);
  }

  if (perfilId) {
    return query.eq("user_id", perfilId);
  }

  if (authUserId) {
    return query.eq("user_id", authUserId);
  }

  return query;
}

function resolvePreferenceFromPermissions(permissoes, keys = []) {
  const source = permissoes && typeof permissoes === "object" ? permissoes : {};

  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  const nested = source.preferencias && typeof source.preferencias === "object" ? source.preferencias : {};
  for (const key of keys) {
    const value = nested[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return undefined;
}

function mapPreferenciasFromPermissoes(permissoes) {
  const idioma = resolvePreferenceFromPermissions(permissoes, ["idioma"]);
  const tema = resolvePreferenceFromPermissions(permissoes, ["tema"]);
  const paginaInicial = resolvePreferenceFromPermissions(permissoes, ["paginaInicial", "pagina_inicial"]);
  const formatoData = resolvePreferenceFromPermissions(permissoes, ["formatoData", "formato_data"]);
  const notificacoes = resolvePreferenceFromPermissions(permissoes, ["notificacoes"]);

  if ([idioma, tema, paginaInicial, formatoData, notificacoes].every((item) => item === undefined)) {
    return null;
  }

  return {
    idioma,
    tema,
    paginaInicial,
    formatoData,
    notificacoes,
  };
}

function isRelationMissing(error) {
  if (!error) return false;

  const code = String(error.code || "").toUpperCase();
  const message = String(error.message || "").toLowerCase();

  return code === "42P01"
    || code === "PGRST205"
    || message.includes("could not find the table 'public.user_preferences'")
    || message.includes("relation \"user_preferences\" does not exist");
}

export async function listarUsuarios({ currentUser } = {}) {
  const empresaId = resolveEmpresaIdFromContext(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  const scopedUsersResult = await applyEmpresaScope(supabase
    .from(USERS_TABLE)
    .select(USER_LIST_BASE_SELECT), empresaId)
    .order("created_at", { ascending: false });

  if (scopedUsersResult.error) {
    return scopedUsersResult;
  }

  const repairResult = await repairUserAuthAssociations({ users: scopedUsersResult.data || [] });
  if (!repairResult.error && Number(repairResult.data?.repairedCount || 0) > 0) {
    return applyEmpresaScope(supabase
      .from(USERS_TABLE)
      .select(USER_LIST_BASE_SELECT), empresaId)
      .order("created_at", { ascending: false });
  }

  return scopedUsersResult;
}

export async function registrarAcaoNegadaUtilizadores({
  currentUser,
  usuarioSelecionadoId,
  requiredPermission,
  action
}) {
  const empresaId = resolveEmpresaIdFromContext(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { error: buildMissingEmpresaError() };
  }

  return registrarAcessoNegado({
    userId: resolveActorUserId(currentUser),
    empresaId,
    modulo: "users",
    entidade: "usuarios",
    entidadeId: usuarioSelecionadoId || null,
    metadata: {
      requiredPermission,
      action
    }
  });
}

export async function guardarUsuarioComAuditoria({
  form,
  modoEdicao,
  usuarioSelecionadoId,
  currentUser,
  perfilOrganizacional,
  permissoesAtuais = {}
}) {
  const nome = String(form.nome || "").trim();
  const apelido = String(form.apelido || "").trim();
  const email = String(form.email || "").trim().toLowerCase();
  const telefone = String(form.telefone || "").trim();
  const username = String(form.username || "").trim();
  const perfil = String(perfilOrganizacional || "").trim();
  const empresaId = resolveEmpresaIdForUserWrite({ currentUser, form, permissoesAtuais });
  const isCreating = !modoEdicao;
  const hasPasswordInput = String(form.password || "").trim().length > 0;

  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    throw new Error("empresa_id obrigatorio para criar/atualizar utilizador.");
  }

  let accountStatus = isCreating
    ? "pending_activation"
    : String(form.account_status || (form.ativo ? "active" : "disabled")).trim().toLowerCase();
  let isDisabled = accountStatus === "disabled";
  let isPendingActivation = accountStatus === "pending_activation";

  const permissoesBase = {
    ...(permissoesAtuais && typeof permissoesAtuais === "object" ? permissoesAtuais : {}),
    ...(form.permissoes && typeof form.permissoes === "object" ? form.permissoes : {})
  };

  const permissoesNormalizadas = normalizarPermissoes(permissoesBase);
  if (perfil) {
    permissoesNormalizadas.__perfil = perfil;
  } else {
    delete permissoesNormalizadas.__perfil;
  }

  const payload = {
    nome,
    apelido,
    email,
    telefone,
    username,
    permissoes: permissoesNormalizadas,
    ativo: !isDisabled,
    account_status: accountStatus,
    activated_at: accountStatus === "active" ? new Date().toISOString() : null,
    activation_sent_at: isPendingActivation ? new Date().toISOString() : null,
    disabled_at: isDisabled ? new Date().toISOString() : null,
    empresa_id: empresaId,
    created_by: resolveActorUserId(currentUser)
  };

  let error;
  let createdProfileId = usuarioSelecionadoId || null;
  let reusedExistingProfile = false;
  let authUserIdForPasswordUpdate = null;
  let emailChangeContext = null;

  if (modoEdicao && usuarioSelecionadoId) {
    const { data: editProfile, error: editProfileError } = await applyEmpresaScope(
      supabase
        .from(USERS_TABLE)
        .select("id,auth_user_id,email,account_status,activation_sent_at,activated_at,disabled_at")
        .eq("id", usuarioSelecionadoId),
      empresaId
    ).maybeSingle();

    if (editProfileError) {
      return { error: editProfileError };
    }

    const persistedStatus = String(editProfile?.account_status || "").trim().toLowerCase();
    if (["active", "pending_activation", "disabled"].includes(persistedStatus)) {
      accountStatus = persistedStatus;
      isDisabled = accountStatus === "disabled";
      isPendingActivation = accountStatus === "pending_activation";
      payload.account_status = accountStatus;
      payload.ativo = !isDisabled;
      payload.activated_at = accountStatus === "active" ? editProfile?.activated_at || null : null;
      payload.activation_sent_at = isPendingActivation ? editProfile?.activation_sent_at || null : null;
      payload.disabled_at = isDisabled ? editProfile?.disabled_at || null : null;
    }

    authUserIdForPasswordUpdate = String(editProfile?.auth_user_id || "").trim() || null;

    const previousEmail = String(editProfile?.email || "").trim().toLowerCase();
    if (authUserIdForPasswordUpdate && previousEmail !== email) {
      const authEmailResult = await updateAuthUserEmail({
        usuarioId: usuarioSelecionadoId,
        authUserId: authUserIdForPasswordUpdate,
        empresaId,
        newEmail: email
      });
      if (authEmailResult.error) return { error: authEmailResult.error };
      emailChangeContext = {
        previousEmail,
        nextEmail: email,
        authUserId: authUserIdForPasswordUpdate
      };
    }

    ({ error } = await applyEmpresaScope(
      supabase.from(USERS_TABLE).update(payload).eq("id", usuarioSelecionadoId),
      empresaId
    ));

    if (error && emailChangeContext) {
      await updateAuthUserEmail({
        usuarioId: usuarioSelecionadoId,
        authUserId: emailChangeContext.authUserId,
        empresaId,
        newEmail: emailChangeContext.previousEmail
      });
      return { error };
    }
  } else {
    const inviteStatusResult = await getAuthUserInviteStatus(email, { empresaId });
    
    console.log("inviteStatusResult =", inviteStatusResult);
    
    if (inviteStatusResult.data?.exists) {
      return {
        error: {
          code: "email_already_exists",
          message: "Já existe uma conta associada a este endereço de e-mail. Utilize outro endereço de e-mail ou utilize a opção \"Reenviar Convite\", caso pretenda reenviar a ativação da conta existente."
        }
      };
    }

    console.log(">>> VAI CONTINUAR A CRIAÇÃO <<<");

    const { data: existingProfileByEmail, error: existingProfileError } = await applyEmpresaScope(
      supabase
        .from(USERS_TABLE)
        .select("id,auth_user_id,email")
        .ilike("email", email),
      empresaId
    ).maybeSingle();

    if (existingProfileError) {
      return { error: existingProfileError };
    }

    const authCreation = await createAuthUserFromAdminFlow({
      email,
      password: form.password,
      existingAuthUserId: existingProfileByEmail?.auth_user_id || null,
      metadata: {
        nome,
        apelido,
        username
      }
    });

    if (authCreation.error || !authCreation.createdUser?.id) {
      return { error: authCreation.error || { message: "Nao foi possivel criar utilizador no Supabase Auth." } };
    }

    const authUserId = authCreation.createdUser.id;
    authUserIdForPasswordUpdate = authUserId;

    if (existingProfileByEmail?.id) {
      reusedExistingProfile = true;

      const { data: updatedUser, error: updateError } = await applyEmpresaScope(
        supabase
          .from(USERS_TABLE)
          .update({
            ...payload,
            auth_user_id: authUserId,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingProfileByEmail.id)
          .select("id"),
        empresaId
      ).maybeSingle();

      error = updateError;
      createdProfileId = updatedUser?.id || existingProfileByEmail.id;
    } else {
      const { data: insertedUser, error: insertError } = await supabase
        .from(USERS_TABLE)
        .insert([
          {
            ...payload,
            auth_user_id: authUserId,
            created_at: new Date().toISOString()
          }
        ])
        .select("id")
        .maybeSingle();

      error = insertError;
      createdProfileId = insertedUser?.id || null;
    }

    if (!error) {
      const { data: consistencyProfile, error: consistencyError } = await applyEmpresaScope(supabase
        .from(USERS_TABLE)
        .select("id,auth_user_id,email")
        .eq("id", createdProfileId),
        empresaId
      )
        .maybeSingle();

      if (consistencyError || !consistencyProfile || consistencyProfile.email !== email) {
        return {
          error: consistencyError || { message: "Falha de consistencia entre auth.users e usuarios." }
        };
      }

      if (!authCreation.inviteSent) {
        const { error: activationInviteError } = await sendAccountActivationInvite(email, undefined, { nome, username, empresaId });
        if (activationInviteError) {
          return { error: activationInviteError };
        }
      }

      await applyEmpresaScope(
        supabase
          .from(USERS_TABLE)
          .update({
            activation_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", createdProfileId),
        empresaId
      );
    }
  }

  if (error) {
    return { error };
  }

  if (hasPasswordInput && authUserIdForPasswordUpdate) {
    if (String(form.password || "").length < ADMIN_PASSWORD_MIN_LENGTH) {
      return {
        error: {
          code: "weak_password",
          message: "A palavra-passe deve possuir pelo menos 8 caracteres."
        }
      };
    }

    const passwordUpdateResult = await alterarPasswordUtilizador({
      authUserId: authUserIdForPasswordUpdate,
      password: form.password
    });

    if (passwordUpdateResult.error) {
      return { error: passwordUpdateResult.error };
    }
  }

  const preferenciasPayload = mapPreferenciasFromPermissoes(permissoesNormalizadas);
  if (createdProfileId && preferenciasPayload) {
    const preferenciasResult = await upsertUserPreferencesByUserId({
      userId: createdProfileId,
      ...preferenciasPayload,
    });

    if (preferenciasResult.error && !isRelationMissing(preferenciasResult.error)) {
      return { error: preferenciasResult.error };
    }
  }

  const auditoriaBase = {
    userId: resolveActorUserId(currentUser),
    empresaId,
    modulo: "users",
    entidade: "usuarios",
    entidadeId: createdProfileId,
    metadata: {
      perfilOrganizacional,
      permissoesSelecionadas: Object.keys(permissoesNormalizadas).filter((key) => permissoesNormalizadas[key])
    }
  };

  if (modoEdicao) {
    await registrarEdicao({
      ...auditoriaBase,
      metadata: {
        ...auditoriaBase.metadata,
        ...(emailChangeContext
          ? {
              action: "change_user_email",
              usuarioId: createdProfileId,
              empresaId,
              authUserId: emailChangeContext.authUserId,
              previousEmail: emailChangeContext.previousEmail,
              nextEmail: emailChangeContext.nextEmail
            }
          : {})
      }
    });
  } else if (reusedExistingProfile) {
    await registrarEdicao({
      ...auditoriaBase,
      metadata: {
        ...auditoriaBase.metadata,
        action: "reuse_existing_auth_user"
      }
    });
  } else {
    await registrarCriacao(auditoriaBase);
  }

  return { error: null, permissoesNormalizadas };
}

export async function reenviarConviteAtivacaoUtilizador({ usuarioId, targetEmail, redirectTo, currentUser }) {
  const empresaId = resolveEmpresaIdFromContext(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    throw new Error("empresa_id obrigatorio para reenviar convite.");
  }

  if (!usuarioId) {
    return { error: { message: "Utilizador inválido para reenviar convite." } };
  }

  const result = await supabase.functions.invoke("reactivate-user", {
    body: {
      usuarioId,
      targetEmail: targetEmail || undefined,
      redirectTo: redirectTo || undefined
    }
  });

  if (result.error) return { error: result.error };
  if (!result.data?.success) {
    return {
      error: {
        code: result.data?.error || "reactivation_failed",
        message: result.data?.message || "Falha ao reenviar ativação."
      }
    };
  }

  return { error: null, data: result.data.data || null };
}

export async function enviarRedefinicaoPasswordUtilizador({ usuarioId, currentUser, redirectTo } = {}) {
  const empresaId = resolveEmpresaIdFromContext(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    throw new Error("empresa_id obrigatorio para envio de redefinicao de password.");
  }

  if (!usuarioId) {
    return { error: { message: "Utilizador inválido para redefinição de password." } };
  }

  const { data: targetUser, error: targetError } = await applyEmpresaScope(
    supabase
      .from(USERS_TABLE)
      .select("id,email,auth_user_id")
      .eq("id", usuarioId),
    empresaId
  ).maybeSingle();

  if (targetError) {
    return { error: targetError };
  }

  if (!targetUser?.email) {
    return { error: { message: "Utilizador sem email para redefinição de password." } };
  }

  const statusResult = await getAuthUserInviteStatus(targetUser.email, {
    usuarioId: targetUser.id,
    authUserId: targetUser.auth_user_id,
    empresaId
  });
  if (statusResult.error) {
    return { error: statusResult.error };
  }

  if (!statusResult.data?.exists) {
    return { error: { message: "Conta Auth inexistente. Reenvie convite de ativação." } };
  }

  const resetEmail = String(statusResult.data?.user?.email || targetUser.email).trim().toLowerCase();
  const resetResult = await requestPasswordReset(resetEmail, redirectTo);
  if (resetResult.error) {
    return { error: resetResult.error };
  }

  await registrarEdicao({
    userId: resolveActorUserId(currentUser),
    empresaId,
    modulo: "users",
    entidade: "usuarios",
    entidadeId: usuarioId,
    metadata: {
      action: "send_password_reset",
      email: targetUser.email
    }
  });

  return { error: null };
}

export async function repararAssociacaoAuthUtilizador({ usuarioId, email, currentUser }) {
  const empresaId = resolveEmpresaIdFromContext(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    throw new Error("empresa_id obrigatorio para reparacao de associacao auth.");
  }

  if (!usuarioId) {
    return { error: { message: "Utilizador inválido para reparação de associação." } };
  }

  const { data, error } = await supabase.functions.invoke("repair-user-auth-association", {
    body: {
      usuarioId,
      empresaId,
      actorUserId: resolveActorUserId(currentUser)
    }
  });

  if (error) {
    return { error };
  }

  if (!data?.success) {
    return {
      error: {
        message: data?.message || "Falha ao reparar associação auth do utilizador."
      }
    };
  }

  return {
    data: data?.data?.profile || null,
    autoActivated: Boolean(data?.data?.autoActivated),
    error: null
  };
}

export async function obterResumoAtividadePorUtilizador({ perfilId, authUserId, currentUser = null }) {
  if (!perfilId && !authUserId) {
    return {
      data: {
        ultimoAcessoAt: null,
        ultimaAcao: null,
        numeroAcessos: 0,
      },
      error: null,
    };
  }

  const empresaId = resolveEmpresaIdFromContext(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return {
      data: {
        ultimoAcessoAt: null,
        ultimaAcao: null,
        numeroAcessos: 0,
      },
      error: null,
    };
  }

  const ultimoAcessoQuery = applyUserFilter(
    applyEmpresaScope(supabase
      .from("user_sessions")
      .select("last_activity_at")
      .not("last_activity_at", "is", null)
    , empresaId)
      .order("last_activity_at", { ascending: false })
      .limit(1),
    { perfilId, authUserId }
  );

  const numeroAcessosQuery = applyUserFilter(
    applyEmpresaScope(supabase
      .from("user_sessions")
      .select("id", { count: "exact", head: true })
    , empresaId)
      .not("login_at", "is", null),
    { perfilId, authUserId }
  );

  const ultimaAcaoQuery = applyUserFilter(
    applyEmpresaScope(supabase
      .from("audit_logs")
      .select("id,event_type,created_at")
    , empresaId)
      .order("created_at", { ascending: false })
      .limit(1),
    { perfilId, authUserId }
  );

  const [ultimoAcessoResult, numeroAcessosResult, ultimaAcaoResult] = await Promise.all([
    ultimoAcessoQuery,
    numeroAcessosQuery,
    ultimaAcaoQuery,
  ]);

  const error = ultimoAcessoResult.error || numeroAcessosResult.error || ultimaAcaoResult.error || null;
  if (error) {
    return { data: null, error };
  }

  return {
    data: {
      ultimoAcessoAt: ultimoAcessoResult.data?.[0]?.last_activity_at || null,
      ultimaAcao: ultimaAcaoResult.data?.[0] || null,
      numeroAcessos: Number(numeroAcessosResult.count || 0),
    },
    error: null,
  };
}

export async function listarPreferenciasPorUtilizador({ perfilId }) {
  if (!perfilId) {
    return { data: null, error: null };
  }

  const result = await fetchUserPreferencesByUserId(perfilId);
  if (result.error && isRelationMissing(result.error)) {
    return { data: null, error: null };
  }

  return result;
}