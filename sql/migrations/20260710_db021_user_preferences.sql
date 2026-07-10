-- DB-021: Persistencia estrutural de preferencias de utilizador
-- Objetivo: preparar armazenamento simples de idioma, tema, pagina inicial,
-- formato de data e notificacoes sem alteracoes de UX.

create extension if not exists pgcrypto;

create table if not exists user_preferences (
  user_id uuid primary key references usuarios (id) on delete cascade,
  idioma text null,
  tema text null,
  pagina_inicial text null,
  formato_data text null,
  notificacoes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_preferences_updated_at on user_preferences (updated_at desc);

-- Backfill opcional a partir do json de permissoes existente em usuarios.
insert into user_preferences (
  user_id,
  idioma,
  tema,
  pagina_inicial,
  formato_data,
  notificacoes
)
select
  u.id,
  coalesce(u.permissoes ->> 'idioma', u.permissoes -> 'preferencias' ->> 'idioma'),
  coalesce(u.permissoes ->> 'tema', u.permissoes -> 'preferencias' ->> 'tema'),
  coalesce(
    u.permissoes ->> 'pagina_inicial',
    u.permissoes ->> 'paginaInicial',
    u.permissoes -> 'preferencias' ->> 'pagina_inicial',
    u.permissoes -> 'preferencias' ->> 'paginaInicial'
  ),
  coalesce(
    u.permissoes ->> 'formato_data',
    u.permissoes ->> 'formatoData',
    u.permissoes -> 'preferencias' ->> 'formato_data',
    u.permissoes -> 'preferencias' ->> 'formatoData'
  ),
  coalesce(u.permissoes ->> 'notificacoes', u.permissoes -> 'preferencias' ->> 'notificacoes')
from usuarios u
on conflict (user_id) do nothing;

comment on table user_preferences is 'Preferencias basicas do utilizador (persistencia estrutural sem UX dedicada).';
comment on column user_preferences.user_id is 'Ligacao 1:1 com usuarios.id.';
