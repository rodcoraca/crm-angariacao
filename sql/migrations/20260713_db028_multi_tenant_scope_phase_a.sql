-- DB-028: Multi-tenant scope (Fase A)
-- Objetivo: preparar isolamento minimo por empresa nas tabelas operacionais
-- leads, provider_leads e estoque_nao_publicitado.

alter table if exists leads
  add column if not exists empresa_id uuid null;

alter table if exists provider_leads
  add column if not exists empresa_id uuid null;

alter table if exists estoque_nao_publicitado
  add column if not exists empresa_id uuid null;

create index if not exists idx_leads_empresa_id on leads (empresa_id);
create index if not exists idx_leads_empresa_tipo_created_at on leads (empresa_id, tipo, created_at desc);

create index if not exists idx_provider_leads_empresa_id on provider_leads (empresa_id);
create index if not exists idx_provider_leads_empresa_detected_at on provider_leads (empresa_id, detected_at desc);

create index if not exists idx_estoque_np_empresa_id on estoque_nao_publicitado (empresa_id);
create index if not exists idx_estoque_np_empresa_created_at on estoque_nao_publicitado (empresa_id, created_at desc);

comment on column leads.empresa_id is 'Escopo organizacional para isolamento multi-tenant (Fase A).';
comment on column provider_leads.empresa_id is 'Escopo organizacional para isolamento multi-tenant (Fase A).';
comment on column estoque_nao_publicitado.empresa_id is 'Escopo organizacional para isolamento multi-tenant (Fase A).';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'provider_leads_provider_external_id_key'
  ) THEN
    ALTER TABLE provider_leads
      DROP CONSTRAINT provider_leads_provider_external_id_key;
  END IF;
END
$$;

create unique index if not exists uq_provider_leads_empresa_provider_external_id
  on provider_leads (
    coalesce(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid),
    provider,
    external_id
  );