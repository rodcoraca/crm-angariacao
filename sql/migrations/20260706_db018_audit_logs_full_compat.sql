-- DB-018: Compatibilidade completa de audit_logs com o codigo atual
-- Objetivo: garantir contrato usado por Identity & Access sem alterar codigo.

alter table if exists audit_logs
  add column if not exists event_type text null,
  add column if not exists status text null,
  add column if not exists user_id text null,
  add column if not exists empresa_id uuid null,
  add column if not exists modulo text null,
  add column if not exists entidade text null,
  add column if not exists entidade_id text null,
  add column if not exists ip_address text null,
  add column if not exists user_agent text null,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

-- Backfill de event_type e status a partir de colunas legadas comuns.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'acao'
  ) then
    execute '
      update audit_logs
      set event_type = coalesce(event_type, acao::text)
      where event_type is null
    ';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'action'
  ) then
    execute '
      update audit_logs
      set event_type = coalesce(event_type, action::text)
      where event_type is null
    ';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'tipo_evento'
  ) then
    execute '
      update audit_logs
      set event_type = coalesce(event_type, tipo_evento::text)
      where event_type is null
    ';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'estado'
  ) then
    execute '
      update audit_logs
      set status = coalesce(status, estado::text)
      where status is null
    ';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'resultado'
  ) then
    execute '
      update audit_logs
      set status = coalesce(status, resultado::text)
      where status is null
    ';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'usuario_id'
  ) then
    execute '
      update audit_logs
      set user_id = coalesce(user_id, usuario_id::text)
      where user_id is null
    ';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'utilizador_id'
  ) then
    execute '
      update audit_logs
      set user_id = coalesce(user_id, utilizador_id::text)
      where user_id is null
    ';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'detalhes'
  ) then
    execute '
      update audit_logs
      set metadata = case
        when metadata is null or metadata = ''{}''::jsonb then jsonb_build_object(''detalhes'', detalhes::text)
        else metadata
      end
    ';
  end if;
end
$$;

update audit_logs
set event_type = coalesce(event_type, 'unknown_event')
where event_type is null;

update audit_logs
set status = coalesce(status, 'success')
where status is null;

create index if not exists idx_audit_logs_event_type on audit_logs (event_type);
create index if not exists idx_audit_logs_status on audit_logs (status);
create index if not exists idx_audit_logs_user_id_text on audit_logs (user_id);
create index if not exists idx_audit_logs_created_at on audit_logs (created_at desc);
create index if not exists idx_audit_logs_metadata on audit_logs using gin (metadata);

comment on column audit_logs.event_type is 'Tipo de evento de auditoria (compativel com legados).';
comment on column audit_logs.status is 'Estado do evento de auditoria (success, denied, error, etc.).';
comment on column audit_logs.user_id is 'Identificador do utilizador no contexto de auditoria (texto para compatibilidade legada).';
