const PERFIS_DISPONIVEIS = [
  "Administrador",
  "Diretor Comercial",
  "Consultor",
  "Marketing",
  "Financeiro",
  "Outro",
];

export function criarUsuariosViewModel({ form, perfilOrganizacional, usuarioSelecionadoMeta, modoEdicao, modulos }) {
  const dataCriacao =
    modoEdicao && usuarioSelecionadoMeta?.created_at
      ? new Date(usuarioSelecionadoMeta.created_at).toLocaleString("pt-PT")
      : "Novo utilizador";

  return {
    dadosPessoais: {
      nome: form.nome,
      apelido: form.apelido,
      email: form.email,
      telefone: form.telefone,
    },

    conta: {
      estado: form.ativo ? "ativo" : "inativo",
      ultimoAcesso: "Nao disponivel",
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
      modulos,
      permissoes: form.permissoes,
    },

    atividade: {
      ultimoAcesso: "Nao disponivel",
      ultimaAcao: "Nao disponivel",
      numeroAcessos: "Nao disponivel",
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
