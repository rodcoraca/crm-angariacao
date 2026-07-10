-- DB-023: Diagnostico de consistencia entre usuarios e auth.users
-- Objetivo: disponibilizar relatorio de inconsistencias sem alterar dados.

create or replace function public.listar_utilizadores_inconsistentes()
returns table (
  classe text,
  usuario_id uuid,
  auth_user_id uuid,
  email_usuarios text,
  email_auth text,
  detalhe text
)
language sql
security definer
set search_path = public, auth
as $$
  with usuarios_base as (
    select
      u.id as usuario_id,
      u.auth_user_id,
      nullif(lower(trim(u.email)), '') as email_usuarios
    from public.usuarios u
  ),
  auth_base as (
    select
      a.id as auth_user_id,
      nullif(lower(trim(a.email)), '') as email_auth
    from auth.users a
  )
  select
    'A'::text as classe,
    u.usuario_id,
    u.auth_user_id,
    u.email_usuarios,
    null::text as email_auth,
    'auth_user_id inexistente em auth.users'::text as detalhe
  from usuarios_base u
  left join auth_base a on a.auth_user_id = u.auth_user_id
  where u.auth_user_id is not null
    and a.auth_user_id is null

  union all

  select
    'B'::text as classe,
    u.usuario_id,
    u.auth_user_id,
    u.email_usuarios,
    a.email_auth,
    'email divergente entre usuarios e auth.users'::text as detalhe
  from usuarios_base u
  inner join auth_base a on a.auth_user_id = u.auth_user_id
  where coalesce(u.email_usuarios, '') <> coalesce(a.email_auth, '')

  union all

  select
    'C'::text as classe,
    null::uuid as usuario_id,
    a.auth_user_id,
    null::text as email_usuarios,
    a.email_auth,
    'utilizador orfao no Auth (sem perfil em usuarios)'::text as detalhe
  from auth_base a
  left join usuarios_base u on u.auth_user_id = a.auth_user_id
  where u.usuario_id is null
  order by classe, auth_user_id nulls last, usuario_id nulls last;
$$;

revoke all on function public.listar_utilizadores_inconsistentes() from public;
grant execute on function public.listar_utilizadores_inconsistentes() to authenticated;

comment on function public.listar_utilizadores_inconsistentes()
  is 'Relatorio de inconsistencias A/B/C entre public.usuarios e auth.users (somente leitura).';
