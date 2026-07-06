-- DB-016: Complemento final de homologacao Identity & Access
-- Objetivo: garantir existencia das tabelas RBAC faltantes e alinhar colunas/indices
-- usados pelo dominio sem alterar codigo.

create extension if not exists pgcrypto;

-- Garantias em roles (tabela ja existente no ambiente reportado)
alter table if exists roles
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists empresa_id uuid null,
  add column if not exists code text null,
  add column if not exists name text null,
  add column if not exists description text null,
  add column if not exists is_system boolean not null default false,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_roles_empresa_id on roles (empresa_id);
create index if not exists idx_roles_active on roles (is_active);
create unique index if not exists uq_roles_empresa_code_idx on roles (empresa_id, code);

-- permissions (faltante no ambiente reportado)
create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  action text not null,
  code text not null,
  description text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  module_name text null,
  group_key text null,
  group_name text null,
  permission_name text null
);

create unique index if not exists uq_permissions_code_idx on permissions (code);
create unique index if not exists uq_permissions_module_action_idx on permissions (module, action);
create index if not exists idx_permissions_module on permissions (module);
create index if not exists idx_permissions_active on permissions (is_active);
create index if not exists idx_permissions_group_key on permissions (group_key);
create index if not exists idx_permissions_module_group on permissions (module, group_key);

-- role_permissions (faltante no ambiente reportado)
do $$
declare
  role_id_type text;
  permission_id_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into role_id_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'roles'
    and a.attname = 'id'
    and a.attnum > 0
    and not a.attisdropped;

  select format_type(a.atttypid, a.atttypmod)
    into permission_id_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'permissions'
    and a.attname = 'id'
    and a.attnum > 0
    and not a.attisdropped;

  if role_id_type is null then
    raise exception 'Tabela roles sem coluna id no schema public.';
  end if;

  if permission_id_type is null then
    raise exception 'Tabela permissions sem coluna id no schema public.';
  end if;

  execute format(
    'create table if not exists role_permissions (
      id uuid primary key default gen_random_uuid(),
      role_id %s not null references roles (id) on delete cascade,
      permission_id %s not null references permissions (id) on delete cascade,
      created_at timestamptz not null default now()
    )',
    role_id_type,
    permission_id_type
  );
end
$$;

create unique index if not exists uq_role_permissions_role_permission_idx
  on role_permissions (role_id, permission_id);
create index if not exists idx_role_permissions_role_id on role_permissions (role_id);
create index if not exists idx_role_permissions_permission_id on role_permissions (permission_id);

-- user_roles (faltante no ambiente reportado)
do $$
declare
  role_id_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into role_id_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'roles'
    and a.attname = 'id'
    and a.attnum > 0
    and not a.attisdropped;

  if role_id_type is null then
    raise exception 'Tabela roles sem coluna id no schema public.';
  end if;

  execute format(
    'create table if not exists user_roles (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null,
      role_id %s not null references roles (id) on delete cascade,
      empresa_id uuid null,
      is_primary boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )',
    role_id_type
  );
end
$$;

create unique index if not exists uq_user_roles_user_role_empresa_idx
  on user_roles (user_id, role_id, coalesce(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists idx_user_roles_user_id on user_roles (user_id);
create index if not exists idx_user_roles_role_id on user_roles (role_id);
create index if not exists idx_user_roles_empresa_id on user_roles (empresa_id);
create index if not exists idx_user_roles_primary on user_roles (is_primary);

-- user_sessions: coluna usada pelo codigo de sessao
alter table if exists user_sessions
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on table permissions is 'Permissoes granulares por modulo e acao.';
comment on table role_permissions is 'Relacao N:N entre perfis e permissoes.';
comment on table user_roles is 'Relacao N:N entre utilizadores e perfis, com escopo opcional por empresa.';
comment on column user_sessions.metadata is 'Metadados operacionais da sessao (ex.: motivo de terminacao).';
