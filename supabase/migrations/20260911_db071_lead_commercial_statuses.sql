-- DB-071: ciclo de vida comercial dos Leads.

ALTER TABLE public.leads
  ALTER COLUMN status SET DEFAULT 'novo';

-- Mapping explicito dos valores legados conhecidos. Valores historicos
-- desconhecidos nao sao apagados nem transformados silenciosamente.
UPDATE public.leads SET status = 'em_contacto' WHERE status = 'contactado';
UPDATE public.leads SET status = 'agendamento' WHERE status = 'agendado';
UPDATE public.leads SET status = 'convertido' WHERE status = 'fechado';

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN (
    'novo', 'em_contacto', 'em_acompanhamento', 'agendamento',
    'proposta', 'convertido', 'nao_evoluiu', 'migrado'
  )) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_leads_empresa_status_created_at
  ON public.leads (empresa_id, status, created_at DESC);

COMMENT ON COLUMN public.leads.status IS
  'Estado comercial do Lead; independente do estado tecnico de importacao do Radar.';