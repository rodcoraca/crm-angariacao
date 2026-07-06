-- DB-015: Homologacao final do dominio Identity & Access
-- Objetivo: alinhar esquema de base de dados com as colunas efetivamente usadas pelo codigo
-- sem alterar arquitetura nem remover campos em uso.

create extension if not exists pgcrypto;

-- usuarios (colunas usadas por login, gestao de utilizadores e logs)
alter table if exists usuarios
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists auth_user_id uuid null,
  add column if not exists nome text null,
  add column if not exists apelido text null,
  add column if not exists email text null,
  add column if not exists telefone text null,
  add column if not exists username text null,
  add column if not exists ativo boolean not null default true,
  add column if not exists permissoes jsonb not null default '{}'::jsonb,
  add column if not exists empresa_id uuid null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid null;

create index if not exists idx_usuarios_auth_user_id on usuarios (auth_user_id);
create index if not exists idx_usuarios_username on usuarios (username);
create index if not exists idx_usuarios_email on usuarios (email);
create index if not exists idx_usuarios_created_at on usuarios (created_at desc);

-- user_sessions (codigo usa metadata ao terminar sessoes anteriores)
alter table if exists user_sessions
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column user_sessions.metadata is 'Metadados operacionais da sessao (ex.: motivo de terminacao).';

-- Sem alteracoes estruturais adicionais em audit_logs, roles, permissions,
-- role_permissions e user_roles: esquema atual ja cobre colunas usadas pelo codigo.
