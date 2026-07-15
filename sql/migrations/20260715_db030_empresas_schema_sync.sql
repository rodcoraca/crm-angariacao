-- DB-030: Sincronização complementar de schema da tabela empresas
-- Objetivo: alinhar estrutura legada de empresas com o módulo Administração -> Empresas.

alter table if exists public.empresas
  add column if not exists slug text;

alter table if exists public.empresas
  add column if not exists estado text default 'ativa';

alter table if exists public.empresas
  add column if not exists updated_at timestamptz;

update public.empresas
set slug = lower(
  regexp_replace(
    nome,
    '[^a-zA-Z0-9]+',
    '-',
    'g'
  )
)
where slug is null;

update public.empresas
set updated_at = now()
where updated_at is null;

-- Backfill defensivo para ambientes legados com coluna booleana `ativo`.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'empresas'
      and column_name = 'ativo'
  ) then
    execute '
      update public.empresas
      set estado = case when ativo = true then ''ativa'' else ''inativa'' end
      where estado is null
    ';
  else
    update public.empresas
    set estado = 'ativa'
    where estado is null;
  end if;
end
$$;
