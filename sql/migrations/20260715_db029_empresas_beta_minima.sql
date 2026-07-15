-- DB-029: Administração de Empresas Beta (Mínima)
-- Objetivo: criar entidade base `empresas` para eliminar contexto nulo de empresa_id
-- em fluxos operacionais Beta e preparar evolução multi-tenant.

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null,
  estado text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_empresas_slug unique (slug),
  constraint ck_empresas_estado check (estado in ('ativo', 'inativo'))
);

create index if not exists idx_empresas_estado on public.empresas (estado);
create index if not exists idx_empresas_nome on public.empresas (nome);

create or replace function public.set_empresas_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_empresas_updated_at on public.empresas;
create trigger trg_empresas_updated_at
before update on public.empresas
for each row
execute function public.set_empresas_updated_at();

insert into public.empresas (nome, slug, estado)
select 'OSFlow Beta', 'osflow-beta', 'ativo'
where not exists (
  select 1
  from public.empresas
  where slug = 'osflow-beta'
);

comment on table public.empresas is 'Catálogo mínimo de empresas para contexto Beta multi-tenant.';
comment on column public.empresas.slug is 'Identificador amigável e único da empresa.';
