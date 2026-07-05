-- DB-013: Hierarquia de permissoes (module/group/permission/key)
-- Mantem compatibilidade com estrutura atual sem remover dados.

alter table permissions
  add column if not exists module_name text null,
  add column if not exists group_key text null,
  add column if not exists group_name text null,
  add column if not exists permission_name text null;

update permissions
set
  module_name = coalesce(module_name, module),
  group_key = coalesce(group_key, 'default'),
  group_name = coalesce(group_name, 'Geral'),
  permission_name = coalesce(permission_name, action)
where module_name is null
   or group_key is null
   or group_name is null
   or permission_name is null;

create index if not exists idx_permissions_group_key on permissions (group_key);
create index if not exists idx_permissions_module_group on permissions (module, group_key);

comment on column permissions.module_name is 'Nome de apresentação do módulo.';
comment on column permissions.group_key is 'Chave técnica do grupo de permissões.';
comment on column permissions.group_name is 'Nome de apresentação do grupo de permissões.';
comment on column permissions.permission_name is 'Nome de apresentação da permissão.';
