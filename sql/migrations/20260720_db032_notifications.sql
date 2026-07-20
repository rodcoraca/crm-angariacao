-- DB-032: Infraestrutura de notificações OSFlow
-- Objetivo: criar queue e logs para notificações transversais, com empresa_id opcional
-- para compatibilidade multi-tenant futura.

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid null references public.empresas(id) on delete set null,
  provider text not null default 'verpex_smtp',
  type text not null,
  recipient text not null,
  subject text not null,
  html_body text not null,
  text_body text null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz null,
  failed_at timestamptz null,
  constraint notification_queue_status_check
    check (status in ('pending', 'sent', 'failed')),
  constraint notification_queue_attempts_check
    check (attempts >= 0)
);

create index if not exists notification_queue_empresa_id_idx
  on public.notification_queue (empresa_id);

create index if not exists notification_queue_status_created_at_idx
  on public.notification_queue (status, created_at desc);

create index if not exists notification_queue_type_created_at_idx
  on public.notification_queue (type, created_at desc);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid null references public.notification_queue(id) on delete set null,
  empresa_id uuid null references public.empresas(id) on delete set null,
  provider text not null,
  type text not null,
  recipient text not null,
  subject text not null,
  status text not null,
  error text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notification_logs_queue_id_idx
  on public.notification_logs (queue_id);

create index if not exists notification_logs_empresa_id_idx
  on public.notification_logs (empresa_id);

create index if not exists notification_logs_created_at_idx
  on public.notification_logs (created_at desc);

alter table public.notification_queue enable row level security;
alter table public.notification_logs enable row level security;

grant insert, update, select on public.notification_queue to service_role;
grant insert, select on public.notification_logs to service_role;

drop policy if exists notification_queue_service_role_all on public.notification_queue;
create policy notification_queue_service_role_all
  on public.notification_queue
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists notification_logs_service_role_insert on public.notification_logs;
create policy notification_logs_service_role_insert
  on public.notification_logs
  for insert
  to service_role
  with check (true);

drop policy if exists notification_logs_service_role_select on public.notification_logs;
create policy notification_logs_service_role_select
  on public.notification_logs
  for select
  to service_role
  using (true);
