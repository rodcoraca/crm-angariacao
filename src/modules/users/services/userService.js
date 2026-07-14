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
import { createAuthUserFromAdminFlow, repairUserAuthAssociations, sendAccountActivationInvite } from "../../auth/services";
import { fetchUserPreferencesByUserId, upsertUserPreferencesByUserId } from "../repositories";

const USERS_TABLE = "usuarios";
const USER_LIST_BASE_SELECT = "id,auth_user_id,nome,apelido,email,telefone,username,ativo,account_status,activation_sent_at,activated_at,disabled_at,permissoes,empresa_id,created_at,updated_at";

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

function isFunctionMissing(error) {
  if (!error) return false;

  const code = String(error.code || "").toUpperCase();
  const message = String(error.message || "").toLowerCase();

  return code === "PGRST202"
    || code === "42883"
    || message.includes("could not find the function public.listar_utilizadores_inconsistentes")
    || message.includes("function public.listar_utilizadores_inconsistentes");
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

  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    throw new Error("empresa_id obrigatorio para criar/atualizar utilizador.");
  }

  const accountStatus = isCreating
    ? "pending_activation"
    : String(form.account_status || (form.ativo ? "active" : "disabled")).trim().toLowerCase();
  const isDisabled = accountStatus === "disabled";
  const isPendingActivation = accountStatus === "pending_activation";

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

  if (modoEdicao && usuarioSelecionadoId) {
    ({ error } = await applyEmpresaScope(
      supabase.from(USERS_TABLE).update(payload).eq("id", usuarioSelecionadoId),
      empresaId
    ));
  } else {
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

      const { error: activationInviteError } = await sendAccountActivationInvite(email);
      if (activationInviteError) {
        return { error: activationInviteError };
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
    await registrarEdicao(auditoriaBase);
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

export async function reenviarConviteAtivacaoUtilizador({ usuarioId, currentUser }) {
  const empresaId = resolveEmpresaIdFromContext(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    throw new Error("empresa_id obrigatorio para reenviar convite.");
  }

  if (!usuarioId) {
    return { error: { message: "Utilizador inválido para reenviar convite." } };
  }

  const { data: targetUser, error: targetError } = await applyEmpresaScope(
    supabase
      .from(USERS_TABLE)
      .select("id,email,account_status")
      .eq("id", usuarioId),
    empresaId
  ).maybeSingle();

  if (targetError) {
    return { error: targetError };
  }

  if (!targetUser?.email) {
    return { error: { message: "Utilizador sem email para envio de convite." } };
  }

  const { error: inviteError } = await sendAccountActivationInvite(targetUser.email);
  if (inviteError) {
    return { error: inviteError };
  }

  const { error: updateError } = await applyEmpresaScope(
    supabase
      .from(USERS_TABLE)
      .update({
        account_status: "pending_activation",
        activation_sent_at: new Date().toISOString(),
        activated_at: null,
        disabled_at: null,
        ativo: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", usuarioId),
    empresaId
  );

  if (updateError) {
    return { error: updateError };
  }

  await registrarEdicao({
    userId: resolveActorUserId(currentUser),
    empresaId,
    modulo: "users",
    entidade: "usuarios",
    entidadeId: usuarioId,
    metadata: {
      action: "resend_activation_invite",
      email: targetUser.email,
      previousStatus: targetUser.account_status || null,
      nextStatus: "pending_activation"
    }
  });

  return { error: null };
}

export async function listarSessoesPorUtilizador({ perfilId, authUserId, limit = 50, currentUser = null }) {
  if (!perfilId && !authUserId) return { data: [], error: null };
  const empresaId = resolveEmpresaIdFromContext(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  let query = applyEmpresaScope(supabase
    .from("user_sessions")
    .select("id,user_id,empresa_id,status,ip_address,user_agent,device,login_at,last_activity_at,logout_at,updated_at")
  , empresaId)
    .order("login_at", { ascending: false })
    .limit(limit);

  return applyUserFilter(query, { perfilId, authUserId });
}

export async function listarAuditoriaPorUtilizador({ perfilId, authUserId, limit = 50, currentUser = null }) {
  if (!perfilId && !authUserId) return { data: [], error: null };
  const empresaId = resolveEmpresaIdFromContext(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  let query = applyEmpresaScope(supabase
    .from("audit_logs")
    .select("id,user_id,event_type,status,modulo,entidade,entidade_id,metadata,created_at")
  , empresaId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return applyUserFilter(query, { perfilId, authUserId });
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

export async function listarUtilizadoresInconsistentes({ currentUser = null } = {}) {
  const empresaId = resolveEmpresaIdFromContext(currentUser);
  if (!hasEmpresaId(empresaId)) {
    warnMissingEmpresaId();
    return { data: [], error: null };
  }

  const result = await supabase.rpc("listar_utilizadores_inconsistentes");

  if (isFunctionMissing(result.error)) {
    return {
      data: [],
      error: {
        code: "diagnostic_function_missing",
        message: "Diagnostico indisponivel: migração DB-023 não aplicada."
      }
    };
  }

  if (result.error) {
    return { data: [], error: result.error };
  }

  return { data: result.data || [], error: null };
}
