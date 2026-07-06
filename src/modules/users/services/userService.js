import { supabase } from "../../../supabase";
import { normalizarPermissoes } from "../../../utils/usuarios";
import { registrarAcessoNegado, registrarCriacao, registrarEdicao } from "../../audit/services";
import { createAuthUserFromAdminFlow } from "../../auth/services";

const USERS_TABLE = "usuarios";

function resolveActorUserId(currentUser) {
  return currentUser?.perfil_id || currentUser?.id || null;
}

export async function listarUsuarios() {
  return supabase
    .from(USERS_TABLE)
    .select("id,auth_user_id,nome,apelido,email,telefone,username,ativo,permissoes,created_at,updated_at")
    .order("created_at", { ascending: false });
}

export async function registrarAcaoNegadaUtilizadores({
  currentUser,
  usuarioSelecionadoId,
  requiredPermission,
  action
}) {
  return registrarAcessoNegado({
    userId: resolveActorUserId(currentUser),
    empresaId: currentUser?.user_metadata?.empresa_id || null,
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
  perfilOrganizacional
}) {
  const nome = String(form.nome || "").trim();
  const apelido = String(form.apelido || "").trim();
  const email = String(form.email || "").trim().toLowerCase();
  const telefone = String(form.telefone || "").trim();
  const username = String(form.username || "").trim();

  const permissoesNormalizadas = normalizarPermissoes(form.permissoes);

  const payload = {
    nome,
    apelido,
    email,
    telefone,
    username,
    permissoes: permissoesNormalizadas,
    ativo: form.ativo,
    created_by: resolveActorUserId(currentUser)
  };

  let error;
  let createdProfileId = usuarioSelecionadoId || null;

  if (modoEdicao && usuarioSelecionadoId) {
    ({ error } = await supabase.from(USERS_TABLE).update(payload).eq("id", usuarioSelecionadoId));
  } else {
    const authCreation = await createAuthUserFromAdminFlow({
      email,
      password: form.password,
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

    if (!error) {
      const { data: consistencyProfile, error: consistencyError } = await supabase
        .from(USERS_TABLE)
        .select("id,auth_user_id,email")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (consistencyError || !consistencyProfile || consistencyProfile.email !== email) {
        return {
          error: consistencyError || { message: "Falha de consistencia entre auth.users e usuarios." }
        };
      }
    }
  }

  if (error) {
    return { error };
  }

  const auditoriaBase = {
    userId: resolveActorUserId(currentUser),
    empresaId: currentUser?.user_metadata?.empresa_id || null,
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
  } else {
    await registrarCriacao(auditoriaBase);
  }

  return { error: null, permissoesNormalizadas };
}

export async function listarSessoesPorUtilizador({ perfilId, authUserId, limit = 50 }) {
  if (!perfilId && !authUserId) return { data: [], error: null };

  let query = supabase
    .from("user_sessions")
    .select("id,user_id,empresa_id,status,ip_address,user_agent,device,login_at,last_activity_at,logout_at,updated_at")
    .order("login_at", { ascending: false })
    .limit(limit);

  if (perfilId && authUserId) {
    query = query.or(`user_id.eq.${perfilId},user_id.eq.${authUserId}`);
  } else if (perfilId) {
    query = query.eq("user_id", perfilId);
  } else {
    query = query.eq("user_id", authUserId);
  }

  return query;
}

export async function listarAuditoriaPorUtilizador({ perfilId, authUserId, limit = 50 }) {
  if (!perfilId && !authUserId) return { data: [], error: null };

  let query = supabase
    .from("audit_logs")
    .select("id,user_id,event_type,status,modulo,entidade,entidade_id,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (perfilId && authUserId) {
    query = query.or(`user_id.eq.${perfilId},user_id.eq.${authUserId}`);
  } else if (perfilId) {
    query = query.eq("user_id", perfilId);
  } else {
    query = query.eq("user_id", authUserId);
  }

  return query;
}
