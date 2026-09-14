-- DB-063: hora opcional do lembrete simples da Lead.
BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS hora_lembrete TIME;

COMMIT;
