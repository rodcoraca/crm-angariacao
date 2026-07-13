const PERFIS_DISPONIVEIS = [
  "Administrador",
  "Diretor Comercial",
  "Consultor",
  "Marketing",
  "Financeiro",
  "Outro",
];

function formatDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("pt-PT");
}

function resolveUltimaSessaoValida(sessoesUsuario = []) {
  const invalidStatuses = new Set(["failed", "invalid", "revoked", "denied"]);

  return (sessoesUsuario || []).find((sessao) => {
    const status = String(sessao?.status || "").toLowerCase();
    if (invalidStatuses.has(status)) return false;
    return Boolean(sessao?.login_at || sessao?.last_activity_at || sessao?.updated_at);
  }) || null;
}

function resolvePreferenceValue(permissoes, keys = []) {
  const source = permissoes && typeof permissoes === "object" ? permissoes : {};

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== "") {
      return String(source[key]);
    }
  }

  const nested = source.preferencias && typeof source.preferencias === "object" ? source.preferencias : {};
  for (const key of keys) {
    if (nested[key] !== undefined && nested[key] !== null && String(nested[key]).trim() !== "") {
      return String(nested[key]);
    }
  }

  return "Não configurado";
}

function resolveDisplayValue(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;

    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }

    const normalized = String(value).trim();
    if (normalized !== "") {
      return normalized;
    }
  }

  return "Não configurado";
}

function resolveAccountStatus(meta, form) {
  const status = String(form?.account_status || meta?.account_status || "").trim().toLowerCase();
  if (status === "pending_activation" || status === "active" || status === "disabled") {
    return status;
  }

  return form?.ativo === false ? "disabled" : "active";
}

export function criarUsuariosViewModel({
  form,
  perfilOrganizacional,
  usuarioSelecionadoMeta,
  modoEdicao,
  sessoesUsuario = [],
  auditoriaUsuario = [],
  atividadeResumo = null,
  preferenciasPersistidas = null,
  estruturaPermissoes
}) {
  const dataCriacao =
    modoEdicao && usuarioSelecionadoMeta?.created_at
      ? new Date(usuarioSelecionadoMeta.created_at).toLocaleString("pt-PT")
      : "Novo utilizador";

  const ultimaSessao = resolveUltimaSessaoValida(sessoesUsuario);
  const ultimoAcessoFormatado = formatDateTime(
    ultimaSessao?.last_activity_at || ultimaSessao?.login_at || ultimaSessao?.updated_at
  );
  const ultimoAcessoAtividade = formatDateTime(atividadeResumo?.ultimoAcessoAt);
  const ultimoEventoAtividade = atividadeResumo?.ultimaAcao || null;
  const ultimaAcaoAtividade =
    ultimoEventoAtividade?.event_type && ultimoEventoAtividade?.created_at
      ? `${ultimoEventoAtividade.event_type} (${formatDateTime(ultimoEventoAtividade.created_at) || "n/d"})`
      : ultimoEventoAtividade?.event_type || "Sem atividade registada";
  const numeroAcessosAtividade = Number(atividadeResumo?.numeroAcessos || 0);
  const permissaoMeta = usuarioSelecionadoMeta?.permissoes || {};

  return {
    dadosPessoais: {
      nome: form.nome,
      apelido: form.apelido,
      email: form.email,
      telefone: form.telefone,
    },

    conta: {
      estado: resolveAccountStatus(usuarioSelecionadoMeta, form),
      ultimoAcesso: ultimoAcessoFormatado || "Sem acessos registados",
      dataCriacao,
      username: form.username,
      password: form.password,
      confirmarPassword: form.confirmarPassword,
      modoEdicao,
    },

    perfil: {
      // Arquitetura SaaS (futuro): quando houver tabela/catalogo de roles,
      // este bloco deve receber roleId como fonte primaria e manter `valor` apenas para display.
      valor: perfilOrganizacional,
      opcoes: PERFIS_DISPONIVEIS,
      descricao: "Campo organizacional preparado para futura persistencia. Nao altera permissoes automaticamente.",
    },

    controloAcesso: {
      modulos: estruturaPermissoes,
      permissoes: form.permissoes,
    },

    atividade: {
      ultimoAcesso: ultimoAcessoAtividade || "Sem atividade registada",
      ultimaAcao: ultimaAcaoAtividade,
      numeroAcessos: numeroAcessosAtividade > 0 ? String(numeroAcessosAtividade) : "Sem atividade registada",
    },

    organizacao: {
      // Arquitetura SaaS (futuro): reservar mapeamento da camada de dados para:
      // empresaId, departamentoId, equipaId e supervisorId.
      // Estes campos devem entrar aqui primeiro (viewmodel) antes de qualquer mudanca de persistencia.
      empresa: resolveDisplayValue(
        usuarioSelecionadoMeta?.empresa_id,
        permissaoMeta.empresa_id,
        permissaoMeta.empresa
      ),
      departamento: resolveDisplayValue(permissaoMeta.departamento),
      equipa: resolveDisplayValue(permissaoMeta.equipa),
      supervisor: resolveDisplayValue(permissaoMeta.supervisor),
      cargo: resolveDisplayValue(permissaoMeta.cargo),
    },

    preferencias: {
      idioma: resolveDisplayValue(
        preferenciasPersistidas?.idioma,
        resolvePreferenceValue(permissaoMeta, ["idioma"])
      ),
      tema: resolveDisplayValue(
        preferenciasPersistidas?.tema,
        resolvePreferenceValue(permissaoMeta, ["tema"])
      ),
      paginaInicial: resolveDisplayValue(
        preferenciasPersistidas?.pagina_inicial,
        resolvePreferenceValue(permissaoMeta, ["paginaInicial", "pagina_inicial"])
      ),
      formatoData: resolveDisplayValue(
        preferenciasPersistidas?.formato_data,
        resolvePreferenceValue(permissaoMeta, ["formatoData", "formato_data"])
      ),
      notificacoes: resolveDisplayValue(
        preferenciasPersistidas?.notificacoes,
        resolvePreferenceValue(permissaoMeta, ["notificacoes"])
      ),
    },
  };
}
