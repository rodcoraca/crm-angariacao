-- DB-034: Reconciliação de user_sessions — corrigir user_id de profile PK para auth_user_id
-- Problema: antes do fix de 2026-07-29, user_sessions.user_id era preenchido com
--           usuarios.id (PK interna do OSFlow) em vez de auth.users.id (Supabase Auth UUID).
-- Impacto: sessões não eram encontradas por terminatePreviousSessions nem finalizadas
--          corretamente; o osflow_active_session_user_id no localStorage divergia do
--          supabase.auth.getSession().user.id.
-- Fix de código aplicado: App.jsx sessionUserId = authUser.id (era perfilResolvido.id)
--                         sessionService.js status "closed" → "terminated"/"logged_out"

-- ============================================================
-- 1. Reconciliar user_id e usuario_id nas sessões com profile PK
-- Atualiza sessões onde user_id corresponde a um usuarios.id (profile PK)
-- para o auth_user_id correspondente.
-- ============================================================
do $$
begin
  -- Corrigir user_id (coluna uuid original de DB-004)
  update user_sessions us
  set
    user_id   = u.auth_user_id,
    updated_at = now()
  from usuarios u
  where us.user_id          = u.id
    and u.auth_user_id      is not null
    and us.user_id          is distinct from u.auth_user_id;

  -- Corrigir usuario_id (coluna legada, se existir)
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'user_sessions'
      and column_name  = 'usuario_id'
  ) then
    execute '
      update user_sessions us
      set
        usuario_id = u.auth_user_id,
        updated_at = now()
      from usuarios u
      where us.usuario_id::text = u.id::text
        and u.auth_user_id is not null
        and us.usuario_id::text is distinct from u.auth_user_id::text
    ';
  end if;
end
$$;

-- ============================================================
-- 2. Terminar sessões orphan com status "active" cujo user_id
--    ainda é um profile PK sem auth_user_id mapeável.
-- ============================================================
update user_sessions us
set
  status     = 'terminated',
  logout_at  = now(),
  updated_at = now()
from usuarios u
where us.user_id     = u.id
  and u.auth_user_id is null
  and us.status      = 'active';

-- ============================================================
-- 3. Terminar sessões "active" muito antigas cujo user_id ainda
--    corresponde a um profile PK (criadas durante o período do bug
--    e sem atividade há mais de 30 dias).
--    Restrição ao bug: exclui sessões com user_id já correto
--    (auth UUID não presente em usuarios.id).
-- ============================================================
update user_sessions us
set
  status     = 'terminated',
  logout_at  = now(),
  updated_at = now()
from usuarios u
where us.user_id          = u.id
  and us.status           = 'active'
  and us.last_activity_at < now() - interval '30 days';

-- ============================================================
-- 4. Garantir constraint de status consistente com o código.
--    O código usa: 'active', 'logged_out', 'terminated'.
--    Valor "closed" foi escrito pelo código defeituoso enquanto
--    a constraint não existia. Deve ser normalizado ANTES de
--    aplicar o constraint — caso contrário o ADD CONSTRAINT
--    falha por violação nos registos existentes com 'closed'.
-- ============================================================

-- 4a. Normalizar 'closed' → 'terminated' (valor inválido do código antigo)
update user_sessions
set
  status     = 'terminated',
  updated_at = now()
where status = 'closed';

-- 4b. Aplicar o constraint (agora sem registos fora do domínio)
alter table user_sessions
  drop constraint if exists chk_user_sessions_status;

alter table user_sessions
  add constraint chk_user_sessions_status
  check (status in ('active', 'logged_out', 'terminated'));

comment on column user_sessions.status is
  'Estados: active (sessão ativa), logged_out (logout explícito), terminated (terminada por nova sessão ou expiração).';
