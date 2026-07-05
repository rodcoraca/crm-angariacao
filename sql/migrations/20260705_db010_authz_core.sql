-- DB-010: Nucleo de autenticacao e autorizacao (RBAC)
-- Objetivo: preparar a infraestrutura de perfis e permissoes para todos os modulos,
-- com preparacao para multiplas empresas sem quebrar o funcionamento atual.

create extension if not exists pgcrypto;

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid null,
  code text not null,
  name text not null,
  description text null,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_roles_empresa_code unique (empresa_id, code)
);

create index if not exists idx_roles_empresa_id on roles (empresa_id);
create index if not exists idx_roles_active on roles (is_active);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  action text not null,
  code text not null,
  description text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_permissions_code unique (code),
  constraint uq_permissions_module_action unique (module, action)
);

create index if not exists idx_permissions_module on permissions (module);
create index if not exists idx_permissions_active on permissions (is_active);

create table if not exists role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles (id) on delete cascade,
  permission_id uuid not null references permissions (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_role_permissions_role_permission unique (role_id, permission_id)
);

create index if not exists idx_role_permissions_role_id on role_permissions (role_id);
create index if not exists idx_role_permissions_permission_id on role_permissions (permission_id);

create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role_id uuid not null references roles (id) on delete cascade,
  empresa_id uuid null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_user_roles_user_role_empresa
  on user_roles (user_id, role_id, coalesce(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index if not exists idx_user_roles_user_id on user_roles (user_id);
create index if not exists idx_user_roles_role_id on user_roles (role_id);
create index if not exists idx_user_roles_empresa_id on user_roles (empresa_id);
create index if not exists idx_user_roles_primary on user_roles (is_primary);

comment on table roles is 'Perfis de acesso (globais ou por empresa).';
comment on table permissions is 'Permissoes granulares por modulo e acao.';
comment on table role_permissions is 'Relacao N:N entre perfis e permissoes.';
comment on table user_roles is 'Relacao N:N entre utilizadores e perfis, com escopo opcional por empresa.';

comment on column roles.empresa_id is 'Preparacao multiempresa (DB-007). FK para empresas sera adicionada quando a tabela existir.';
comment on column user_roles.empresa_id is 'Escopo organizacional opcional do perfil do utilizador (multiempresa).';
