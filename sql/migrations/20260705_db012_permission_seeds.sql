-- DB-012: Seed de permissoes padrao por modulo existente
-- Inclui view/create/edit/delete + permissoes adicionais.

insert into permissions (module, action, code, description, is_active)
values
  ('crm', 'view', 'crm.view', 'Permite visualizar modulo CRM.', true),
  ('crm', 'create', 'crm.create', 'Permite criar no modulo CRM.', true),
  ('crm', 'edit', 'crm.edit', 'Permite editar no modulo CRM.', true),
  ('crm', 'delete', 'crm.delete', 'Permite eliminar no modulo CRM.', true),

  ('dashboard', 'view', 'dashboard.view', 'Permite visualizar Dashboard.', true),
  ('dashboard', 'create', 'dashboard.create', 'Permite criar no Dashboard.', true),
  ('dashboard', 'edit', 'dashboard.edit', 'Permite editar no Dashboard.', true),
  ('dashboard', 'delete', 'dashboard.delete', 'Permite eliminar no Dashboard.', true),

  ('leads.hot', 'view', 'leads.hot.view', 'Permite visualizar Leads Quentes.', true),
  ('leads.hot', 'create', 'leads.hot.create', 'Permite criar Leads Quentes.', true),
  ('leads.hot', 'edit', 'leads.hot.edit', 'Permite editar Leads Quentes.', true),
  ('leads.hot', 'delete', 'leads.hot.delete', 'Permite eliminar Leads Quentes.', true),

  ('leads.warm', 'view', 'leads.warm.view', 'Permite visualizar Leads Mornos.', true),
  ('leads.warm', 'create', 'leads.warm.create', 'Permite criar Leads Mornos.', true),
  ('leads.warm', 'edit', 'leads.warm.edit', 'Permite editar Leads Mornos.', true),
  ('leads.warm', 'delete', 'leads.warm.delete', 'Permite eliminar Leads Mornos.', true),

  ('leads.cold', 'view', 'leads.cold.view', 'Permite visualizar Leads Frios.', true),
  ('leads.cold', 'create', 'leads.cold.create', 'Permite criar Leads Frios.', true),
  ('leads.cold', 'edit', 'leads.cold.edit', 'Permite editar Leads Frios.', true),
  ('leads.cold', 'delete', 'leads.cold.delete', 'Permite eliminar Leads Frios.', true),

  ('messages', 'view', 'messages.view', 'Permite visualizar mensagens.', true),
  ('messages', 'create', 'messages.create', 'Permite criar mensagens.', true),
  ('messages', 'edit', 'messages.edit', 'Permite editar mensagens.', true),
  ('messages', 'delete', 'messages.delete', 'Permite eliminar mensagens.', true),

  ('inventory', 'view', 'inventory.view', 'Permite visualizar estoque.', true),
  ('inventory', 'create', 'inventory.create', 'Permite criar estoque.', true),
  ('inventory', 'edit', 'inventory.edit', 'Permite editar estoque.', true),
  ('inventory', 'delete', 'inventory.delete', 'Permite eliminar estoque.', true),

  ('users', 'view', 'users.view', 'Permite visualizar utilizadores.', true),
  ('users', 'create', 'users.create', 'Permite criar utilizadores.', true),
  ('users', 'edit', 'users.edit', 'Permite editar utilizadores.', true),
  ('users', 'delete', 'users.delete', 'Permite eliminar utilizadores.', true),

  ('logs', 'view', 'logs.view', 'Permite visualizar logs.', true),
  ('logs', 'create', 'logs.create', 'Permite criar logs.', true),
  ('logs', 'edit', 'logs.edit', 'Permite editar logs.', true),
  ('logs', 'delete', 'logs.delete', 'Permite eliminar logs.', true),

  ('radar', 'view', 'radar.view', 'Permite visualizar Radar.', true),
  ('radar', 'create', 'radar.create', 'Permite criar no Radar.', true),
  ('radar', 'edit', 'radar.edit', 'Permite editar no Radar.', true),
  ('radar', 'delete', 'radar.delete', 'Permite eliminar no Radar.', true),

  ('settings', 'view', 'settings.view', 'Permite visualizar Configuracoes.', true),
  ('settings', 'create', 'settings.create', 'Permite criar em Configuracoes.', true),
  ('settings', 'edit', 'settings.edit', 'Permite editar em Configuracoes.', true),
  ('settings', 'delete', 'settings.delete', 'Permite eliminar em Configuracoes.', true),

  ('docs.architecture', 'view', 'docs.architecture.view', 'Permite visualizar documentacao de Arquitetura.', true),
  ('docs.architecture', 'create', 'docs.architecture.create', 'Permite criar documentacao de Arquitetura.', true),
  ('docs.architecture', 'edit', 'docs.architecture.edit', 'Permite editar documentacao de Arquitetura.', true),
  ('docs.architecture', 'delete', 'docs.architecture.delete', 'Permite eliminar documentacao de Arquitetura.', true),

  ('docs.database', 'view', 'docs.database.view', 'Permite visualizar documentacao de Banco de Dados.', true),
  ('docs.database', 'create', 'docs.database.create', 'Permite criar documentacao de Banco de Dados.', true),
  ('docs.database', 'edit', 'docs.database.edit', 'Permite editar documentacao de Banco de Dados.', true),
  ('docs.database', 'delete', 'docs.database.delete', 'Permite eliminar documentacao de Banco de Dados.', true),

  ('docs.roadmap', 'view', 'docs.roadmap.view', 'Permite visualizar documentacao de Roadmap.', true),
  ('docs.roadmap', 'create', 'docs.roadmap.create', 'Permite criar documentacao de Roadmap.', true),
  ('docs.roadmap', 'edit', 'docs.roadmap.edit', 'Permite editar documentacao de Roadmap.', true),
  ('docs.roadmap', 'delete', 'docs.roadmap.delete', 'Permite eliminar documentacao de Roadmap.', true),

  ('docs.saas', 'view', 'docs.saas.view', 'Permite visualizar documentacao SaaS.', true),
  ('docs.saas', 'create', 'docs.saas.create', 'Permite criar documentacao SaaS.', true),
  ('docs.saas', 'edit', 'docs.saas.edit', 'Permite editar documentacao SaaS.', true),
  ('docs.saas', 'delete', 'docs.saas.delete', 'Permite eliminar documentacao SaaS.', true),

  ('docs.security', 'view', 'docs.security.view', 'Permite visualizar documentacao de Seguranca.', true),
  ('docs.security', 'create', 'docs.security.create', 'Permite criar documentacao de Seguranca.', true),
  ('docs.security', 'edit', 'docs.security.edit', 'Permite editar documentacao de Seguranca.', true),
  ('docs.security', 'delete', 'docs.security.delete', 'Permite eliminar documentacao de Seguranca.', true),

  ('docs.changelog', 'view', 'docs.changelog.view', 'Permite visualizar documentacao de Changelog.', true),
  ('docs.changelog', 'create', 'docs.changelog.create', 'Permite criar documentacao de Changelog.', true),
  ('docs.changelog', 'edit', 'docs.changelog.edit', 'Permite editar documentacao de Changelog.', true),
  ('docs.changelog', 'delete', 'docs.changelog.delete', 'Permite eliminar documentacao de Changelog.', true),

  ('crm', 'export', 'crm.export', 'Permite exportacao no CRM.', true),
  ('crm', 'import', 'crm.import', 'Permite importacao no CRM.', true),
  ('dashboard', 'manage', 'dashboard.manage', 'Permite gestao administrativa do Dashboard.', true),
  ('settings', 'manage', 'settings.manage', 'Permite gestao administrativa de Configuracoes.', true)
on conflict (code) do nothing;
