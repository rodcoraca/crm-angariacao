-- DB-025: Discovery Engine - infraestrutura de provider leads
-- Não configura RLS, RBAC, scheduler, scraping ou automações.

create extension if not exists pgcrypto;

create table if not exists public.provider_leads (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text not null,
  title text null,
  price numeric null,
  location text null,
  url text null,
  score numeric null,
  status text not null default 'new',
  detected_at timestamptz not null default now(),
  published_at timestamptz null,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_leads_provider_external_id_key unique (provider, external_id)
);

create index if not exists idx_provider_leads_status_detected_at on public.provider_leads (status, detected_at desc);
create index if not exists idx_provider_leads_provider_published_at on public.provider_leads (provider, published_at desc);
create index if not exists idx_provider_leads_raw_data on public.provider_leads using gin (raw_data);

comment on table public.provider_leads is 'Anúncios normalizados por providers para o Discovery Engine; sem automação de captação.';
