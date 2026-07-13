-- DB-027: Ciclo de vida de conta de utilizador
-- Objetivo: adicionar estado de conta (pending_activation/active/disabled)
-- e carimbos temporais de ativacao/desativacao de forma idempotente.

alter table if exists usuarios
  add column if not exists account_status text,
  add column if not exists activation_sent_at timestamptz null,
  add column if not exists activated_at timestamptz null,
  add column if not exists disabled_at timestamptz null;

update usuarios
set account_status = case
  when ativo = false then 'disabled'
  when coalesce(trim(account_status), '') = '' then 'active'
  else lower(trim(account_status))
end
where account_status is null
   or coalesce(trim(account_status), '') = ''
   or lower(trim(account_status)) not in ('pending_activation', 'active', 'disabled');

update usuarios
set activated_at = coalesce(activated_at, updated_at, created_at, now())
where account_status = 'active'
  and activated_at is null;

update usuarios
set disabled_at = coalesce(disabled_at, updated_at, created_at, now())
where account_status = 'disabled'
  and disabled_at is null;

alter table if exists usuarios
  alter column account_status set default 'active';

create index if not exists idx_usuarios_account_status on usuarios (account_status);
create index if not exists idx_usuarios_empresa_status on usuarios (empresa_id, account_status);

comment on column usuarios.account_status is 'Estado da conta: pending_activation, active, disabled.';
comment on column usuarios.activation_sent_at is 'Data/hora de envio do email de ativacao/recuperacao.';
comment on column usuarios.activated_at is 'Data/hora de ativacao efetiva da conta.';
comment on column usuarios.disabled_at is 'Data/hora de desativacao administrativa da conta.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_usuarios_account_status'
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT chk_usuarios_account_status
      CHECK (account_status IN ('pending_activation', 'active', 'disabled'));
  END IF;
END
$$;