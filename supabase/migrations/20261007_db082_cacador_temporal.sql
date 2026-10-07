-- DB-082: Base temporal e estado de repesquisa do módulo Caçador.
-- Reutiliza provider_leads; não cria uma nova entidade de imóveis.

alter table public.provider_leads
  add column if not exists market_first_seen_at timestamptz null,
  add column if not exists cacador_last_research_at timestamptz null,
  add column if not exists cacador_research_status text null,
  add column if not exists cacador_research_data jsonb null,
  add column if not exists cacador_research_error text null;

update public.provider_leads
set market_first_seen_at = coalesce(market_first_seen_at, detected_at, created_at)
where market_first_seen_at is null;

alter table public.provider_leads
  drop constraint if exists provider_leads_cacador_research_status_check;

alter table public.provider_leads
  add constraint provider_leads_cacador_research_status_check
  check (
    cacador_research_status is null
    or cacador_research_status in ('pending', 'running', 'active', 'changed', 'removed', 'error')
  );

create index if not exists idx_provider_leads_cacador_temporal
  on public.provider_leads (provider, created_at_first, market_first_seen_at);

create index if not exists idx_provider_leads_cacador_research
  on public.provider_leads (provider, cacador_last_research_at);
