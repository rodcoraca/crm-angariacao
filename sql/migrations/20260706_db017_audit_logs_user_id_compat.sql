-- DB-017: Compatibilidade de identidade em audit_logs
-- Objetivo: garantir a coluna user_id usada pelo dominio Identity & Access,
-- preservando dados legados sem alterar codigo.

alter table if exists audit_logs
  add column if not exists user_id text null;

-- Backfill a partir de colunas legadas, se existirem.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'usuario_id'
  ) then
    execute '
      update audit_logs
      set user_id = coalesce(user_id, usuario_id::text)
      where user_id is null
    ';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'utilizador_id'
  ) then
    execute '
      update audit_logs
      set user_id = coalesce(user_id, utilizador_id::text)
      where user_id is null
    ';
  end if;
end
$$;

create index if not exists idx_audit_logs_user_id_text on audit_logs (user_id);

comment on column audit_logs.user_id is 'Identificador do utilizador no contexto de auditoria (compativel com dados legados).';
