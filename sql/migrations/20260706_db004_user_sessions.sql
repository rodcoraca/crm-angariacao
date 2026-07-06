-- DB-004: Sessoes de Utilizador
-- Objetivo: suportar registo operacional de sessoes para login/logout, atividade e encerramento.

create extension if not exists pgcrypto;

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  empresa_id uuid null,
  ip_address text null,
  user_agent text null,
  device text null,
  login_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  logout_at timestamptz null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_user_sessions_status
    check (status in ('active', 'logged_out', 'terminated'))
);

create index if not exists idx_user_sessions_user_id on user_sessions (user_id);
create index if not exists idx_user_sessions_empresa_id on user_sessions (empresa_id);
create index if not exists idx_user_sessions_status on user_sessions (status);
create index if not exists idx_user_sessions_last_activity on user_sessions (last_activity_at desc);
create index if not exists idx_user_sessions_login_at on user_sessions (login_at desc);

comment on table user_sessions is 'Registo operacional de sessoes de utilizador para login, logout e atividade.';
comment on column user_sessions.status is 'Estados previstos: active, logged_out, terminated.';
comment on column user_sessions.empresa_id is 'Escopo organizacional opcional para contexto multiempresa.';
