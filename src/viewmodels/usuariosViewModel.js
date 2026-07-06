const PERFIS_DISPONIVEIS = [
  "Administrador",
  "Diretor Comercial",
  "Consultor",
  "Marketing",
  "Financeiro",
  "Outro",
];

export function criarUsuariosViewModel({
  form,
  perfilOrganizacional,
  usuarioSelecionadoMeta,
  modoEdicao,
  sessoesUsuario = [],
  auditoriaUsuario = [],
  estruturaPermissoes
}) {
  const dataCriacao =
    modoEdicao && usuarioSelecionadoMeta?.created_at
      ? new Date(usuarioSelecionadoMeta.created_at).toLocaleString("pt-PT")
      : "Novo utilizador";

  const ultimaSessao = sessoesUsuario[0] || null;
  const ultimoEvento = auditoriaUsuario[0] || null;

  return {
    dadosPessoais: {
      nome: form.nome,
      apelido: form.apelido,
      email: form.email,
      telefone: form.telefone,
    },

    conta: {
      estado: form.ativo ? "ativo" : "inativo",
      ultimoAcesso: ultimaSessao?.last_activity_at
        ? new Date(ultimaSessao.last_activity_at).toLocaleString("pt-PT")
        : "Nao disponivel",
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
      ultimoAcesso: ultimaSessao?.last_activity_at
        ? new Date(ultimaSessao.last_activity_at).toLocaleString("pt-PT")
        : "Nao disponivel",
      ultimaAcao: ultimoEvento?.event_type || "Nao disponivel",
      numeroAcessos: String(sessoesUsuario.length || 0),
    },

    organizacao: {
      // Arquitetura SaaS (futuro): reservar mapeamento da camada de dados para:
      // empresaId, departamentoId, equipaId e supervisorId.
      // Estes campos devem entrar aqui primeiro (viewmodel) antes de qualquer mudanca de persistencia.
      empresa: "Placeholder",
      departamento: "Placeholder",
      supervisor: "Placeholder",
      equipa: "Placeholder",
    },

    preferencias: {
      idioma: "Placeholder",
      tema: "Placeholder",
      paginaInicial: "Placeholder",
      formatoData: "Placeholder",
      notificacoes: "Placeholder",
    },
  };
}
