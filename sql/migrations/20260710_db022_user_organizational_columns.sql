-- DB-022: Preparacao organizacional minima em usuarios
-- Objetivo: adicionar colunas opcionais de estrutura organizacional sem CRUD,
-- sem alteracao de UX e sem implementacao SaaS.

alter table if exists usuarios
  add column if not exists departamento_id uuid null,
  add column if not exists supervisor_id uuid null,
  add column if not exists equipa_id uuid null,
  add column if not exists cargo_id uuid null;

create index if not exists idx_usuarios_departamento_id on usuarios (departamento_id);
create index if not exists idx_usuarios_supervisor_id on usuarios (supervisor_id);
create index if not exists idx_usuarios_equipa_id on usuarios (equipa_id);
create index if not exists idx_usuarios_cargo_id on usuarios (cargo_id);

comment on column usuarios.departamento_id is 'Campo organizacional opcional (preparacao estrutural).';
comment on column usuarios.supervisor_id is 'Campo organizacional opcional (preparacao estrutural).';
comment on column usuarios.equipa_id is 'Campo organizacional opcional (preparacao estrutural).';
comment on column usuarios.cargo_id is 'Campo organizacional opcional (preparacao estrutural).';
