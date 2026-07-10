-- DB-024: Configuracao inicial de Organizacao e Preferencias para administrador
-- Objetivo: preencher configuracao minima sem alterar layout, UX, autenticacao, RBAC ou SaaS.

-- Regras:
-- 1) Aplicar apenas quando configuracao nao existir.
-- 2) Priorizar utilizador administrador identificado por __perfil=Administrador
--    e, em fallback, pelo primeiro utilizador com permissao de gestao de utilizadores.

with admin_candidato as (
  select u.id, u.permissoes
  from usuarios u
  where lower(coalesce(u.permissoes ->> '__perfil', '')) = 'administrador'
     or coalesce((u.permissoes ->> 'usuarios')::boolean, false) = true
  order by u.created_at asc
  limit 1
)
update usuarios u
set
  permissoes = coalesce(u.permissoes, '{}'::jsonb)
    || jsonb_build_object(
      'departamento', coalesce(nullif(u.permissoes ->> 'departamento', ''), 'Administração'),
      'cargo', coalesce(nullif(u.permissoes ->> 'cargo', ''), 'Administrador'),
      'idioma', coalesce(nullif(u.permissoes ->> 'idioma', ''), 'pt-PT'),
      'tema', coalesce(nullif(u.permissoes ->> 'tema', ''), 'light'),
      'paginaInicial', coalesce(
        nullif(u.permissoes ->> 'paginaInicial', ''),
        nullif(u.permissoes ->> 'pagina_inicial', ''),
        '/app'
      ),
      'formatoData', coalesce(
        nullif(u.permissoes ->> 'formatoData', ''),
        nullif(u.permissoes ->> 'formato_data', ''),
        'dd/MM/yyyy'
      )
    )
from admin_candidato a
where u.id = a.id;

-- Persistencia estrutural de preferencias (se DB-021 existir no ambiente).
do $$
begin
  if to_regclass('public.user_preferences') is not null then
    insert into user_preferences (
      user_id,
      idioma,
      tema,
      pagina_inicial,
      formato_data
    )
    select
      u.id,
      'pt-PT',
      'light',
      '/app',
      'dd/MM/yyyy'
    from usuarios u
    where lower(coalesce(u.permissoes ->> '__perfil', '')) = 'administrador'
       or coalesce((u.permissoes ->> 'usuarios')::boolean, false) = true
    order by u.created_at asc
    limit 1
    on conflict (user_id) do update
    set
      idioma = coalesce(nullif(user_preferences.idioma, ''), excluded.idioma),
      tema = coalesce(nullif(user_preferences.tema, ''), excluded.tema),
      pagina_inicial = coalesce(nullif(user_preferences.pagina_inicial, ''), excluded.pagina_inicial),
      formato_data = coalesce(nullif(user_preferences.formato_data, ''), excluded.formato_data),
      updated_at = now();
  end if;
end
$$;
