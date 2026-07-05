-- DB-011: Infraestrutura de auditoria central
-- Regista eventos de login, logout, create, update, delete e acessos negados.

create extension if not exists pgcrypto;

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  status text not null default 'success',
  user_id uuid null,
  empresa_id uuid null,
  modulo text null,
  entidade text null,
  entidade_id text null,
  ip_address text null,
  user_agent text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_event_type on audit_logs (event_type);
create index if not exists idx_audit_logs_status on audit_logs (status);
create index if not exists idx_audit_logs_user_id on audit_logs (user_id);
create index if not exists idx_audit_logs_empresa_id on audit_logs (empresa_id);
create index if not exists idx_audit_logs_created_at on audit_logs (created_at desc);
create index if not exists idx_audit_logs_metadata on audit_logs using gin (metadata);

comment on table audit_logs is 'Tabela central de auditoria da plataforma OSFlow.';
comment on column audit_logs.event_type is 'Tipos previstos: login, logout, create, update, delete, access_denied.';
