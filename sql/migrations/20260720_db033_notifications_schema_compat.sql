-- DB-033: Compatibilidade de schema para notificações OSFlow
-- Objetivo: alinhar ambientes que já tinham notification_queue/notification_logs
-- com a infraestrutura definitiva baseada em NotificationService.

alter table if exists public.notification_queue
  add column if not exists provider text not null default 'verpex_smtp';

alter table if exists public.notification_queue
  add column if not exists html_body text;

alter table if exists public.notification_queue
  add column if not exists text_body text;

alter table if exists public.notification_queue
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.notification_queue
  add column if not exists attempts integer not null default 0;

alter table if exists public.notification_queue
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.notification_queue
  add column if not exists failed_at timestamptz;

update public.notification_queue
set provider = coalesce(provider, 'verpex_smtp')
where provider is null;

update public.notification_queue
set metadata = '{}'::jsonb
where metadata is null;

update public.notification_queue
set attempts = coalesce(attempts, retries, 0)
where attempts is null;

update public.notification_queue
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table if exists public.notification_logs
  add column if not exists empresa_id uuid null references public.empresas(id) on delete set null;

alter table if exists public.notification_logs
  add column if not exists type text;

alter table if exists public.notification_logs
  add column if not exists recipient text;

alter table if exists public.notification_logs
  add column if not exists subject text;

alter table if exists public.notification_logs
  add column if not exists error text;

alter table if exists public.notification_logs
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.notification_logs
set metadata = '{}'::jsonb
where metadata is null;

create index if not exists notification_queue_empresa_id_idx
  on public.notification_queue (empresa_id);

create index if not exists notification_queue_status_created_at_idx
  on public.notification_queue (status, created_at desc);

create index if not exists notification_queue_type_created_at_idx
  on public.notification_queue (type, created_at desc);

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
