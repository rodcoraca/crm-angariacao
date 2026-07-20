-- DB-031: Pedidos de demonstração da landing
-- Objetivo: guardar solicitações enviadas pelo formulário público "Solicitar Demonstração".

create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  empresa text not null,
  telefone text not null,
  email text not null,
  numero_consultores integer not null,
  created_at timestamptz not null default now(),
  status text not null default 'novo',
  constraint demo_requests_numero_consultores_check
    check (numero_consultores between 1 and 9999),
  constraint demo_requests_status_check
    check (status in ('novo', 'email_pending', 'email_failed', 'contactado', 'convertido', 'arquivado'))
);

create index if not exists demo_requests_created_at_idx
  on public.demo_requests (created_at desc);

alter table public.demo_requests enable row level security;

grant insert, update on public.demo_requests to service_role;

drop policy if exists demo_requests_service_role_insert on public.demo_requests;
create policy demo_requests_service_role_insert
  on public.demo_requests
  for insert
  to service_role
  with check (true);

drop policy if exists demo_requests_service_role_update_status on public.demo_requests;
create policy demo_requests_service_role_update_status
  on public.demo_requests
  for update
  to service_role
  using (true)
  with check (true);
