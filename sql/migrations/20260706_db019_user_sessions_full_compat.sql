-- DB-019: Compatibilidade completa de user_sessions com o codigo atual
-- Objetivo: garantir contrato de sessoes usado por Identity & Access sem alterar codigo.

create extension if not exists pgcrypto;

alter table if exists user_sessions
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id text null,
  add column if not exists empresa_id uuid null,
  add column if not exists ip_address text null,
  add column if not exists user_agent text null,
  add column if not exists device text null,
  add column if not exists login_at timestamptz not null default now(),
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists logout_at timestamptz null,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Backfill de user_id a partir de colunas legadas, se existirem.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_sessions'
      and column_name = 'usuario_id'
  ) then
    execute '
      update user_sessions
      set user_id = coalesce(user_id, usuario_id::text)
      where user_id is null
    ';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_sessions'
      and column_name = 'utilizador_id'
  ) then
    execute '
      update user_sessions
      set user_id = coalesce(user_id, utilizador_id::text)
      where user_id is null
    ';
  end if;
end
$$;

create index if not exists idx_user_sessions_user_id on user_sessions (user_id);
create index if not exists idx_user_sessions_empresa_id on user_sessions (empresa_id);
create index if not exists idx_user_sessions_status on user_sessions (status);
create index if not exists idx_user_sessions_last_activity on user_sessions (last_activity_at desc);
create index if not exists idx_user_sessions_login_at on user_sessions (login_at desc);

comment on column user_sessions.user_id is 'Identificador do utilizador no contexto de sessao (compatibilidade legada).';
comment on column user_sessions.metadata is 'Metadados operacionais da sessao.';
