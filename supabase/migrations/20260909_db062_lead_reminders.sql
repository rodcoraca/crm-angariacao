-- DB-062: flags de lembrete simples e tenant-scoped nas Leads.
BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lembrete_ativo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_lembrete DATE;

COMMIT;
