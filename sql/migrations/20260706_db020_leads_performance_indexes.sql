-- DB-020: Homologacao de performance do dominio Leads
-- Escopo: reduzir custo de consultas recorrentes sem alterar regra de negocio.

create index if not exists idx_leads_telefone on leads (telefone);
create index if not exists idx_leads_tipo_created_at on leads (tipo, created_at desc);
create index if not exists idx_leads_status_created_at on leads (status, created_at desc);
create index if not exists idx_leads_agente_id on leads (agente_id);
