-- DB-014: Homologacao do contrato estrutural de colunas
-- Escopo: garantir colunas base (id, created_at, updated_at, ativo, created_by, updated_by)
-- para entidades principais sem alterar regras de negocio nem criar novas tabelas.

create extension if not exists pgcrypto;

-- usuarios
alter table if exists usuarios
  add column if not exists id uuid default gen_random_uuid();
alter table if exists usuarios
  add column if not exists created_at timestamptz not null default now();
alter table if exists usuarios
  add column if not exists updated_at timestamptz not null default now();
alter table if exists usuarios
  add column if not exists ativo boolean not null default true;
alter table if exists usuarios
  add column if not exists created_by uuid null;
alter table if exists usuarios
  add column if not exists updated_by uuid null;

-- roles
alter table if exists roles
  add column if not exists created_by uuid null;
alter table if exists roles
  add column if not exists updated_by uuid null;

-- permissions
alter table if exists permissions
  add column if not exists created_by uuid null;
alter table if exists permissions
  add column if not exists updated_by uuid null;

-- user_roles
alter table if exists user_roles
  add column if not exists created_by uuid null;
alter table if exists user_roles
  add column if not exists updated_by uuid null;

-- audit_logs
alter table if exists audit_logs
  add column if not exists updated_at timestamptz not null default now();

-- user_sessions
alter table if exists user_sessions
  add column if not exists created_by uuid null;
alter table if exists user_sessions
  add column if not exists updated_by uuid null;

-- leads
alter table if exists leads
  add column if not exists id uuid default gen_random_uuid();
alter table if exists leads
  add column if not exists created_at timestamptz not null default now();
alter table if exists leads
  add column if not exists updated_at timestamptz not null default now();
alter table if exists leads
  add column if not exists ativo boolean not null default true;
alter table if exists leads
  add column if not exists created_by uuid null;
alter table if exists leads
  add column if not exists updated_by uuid null;

-- imoveis (nome canonico)
alter table if exists imoveis
  add column if not exists id uuid default gen_random_uuid();
alter table if exists imoveis
  add column if not exists created_at timestamptz not null default now();
alter table if exists imoveis
  add column if not exists updated_at timestamptz not null default now();
alter table if exists imoveis
  add column if not exists ativo boolean not null default true;
alter table if exists imoveis
  add column if not exists created_by uuid null;
alter table if exists imoveis
  add column if not exists updated_by uuid null;

-- estoque_nao_publicitado (nome de tabela atualmente em uso para dominio de imoveis)
alter table if exists estoque_nao_publicitado
  add column if not exists id uuid default gen_random_uuid();
alter table if exists estoque_nao_publicitado
  add column if not exists created_at timestamptz not null default now();
alter table if exists estoque_nao_publicitado
  add column if not exists updated_at timestamptz not null default now();
alter table if exists estoque_nao_publicitado
  add column if not exists ativo boolean not null default true;
alter table if exists estoque_nao_publicitado
  add column if not exists created_by uuid null;
alter table if exists estoque_nao_publicitado
  add column if not exists updated_by uuid null;
