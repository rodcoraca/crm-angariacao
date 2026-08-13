-- ============================================================
-- DB-055
-- Tabela de listings vistos durante uma reconciliação global.
-- Relaciona reconciliation_job ↔ provider_lead, com external_id
-- denormalizado para a fase de expiração futura.
-- Não altera tabelas existentes.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.provider_reconciliation_seen_listings (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  reconciliation_job_id uuid        NOT NULL,
  provider_lead_id      uuid        NOT NULL,
  external_id           text        NOT NULL,
  seen_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT provider_reconciliation_seen_listings_pkey
    PRIMARY KEY (id),

  CONSTRAINT provider_reconciliation_seen_listings_job_fk
    FOREIGN KEY (reconciliation_job_id)
    REFERENCES public.provider_reconciliation_jobs(id) ON DELETE CASCADE,

  CONSTRAINT provider_reconciliation_seen_listings_lead_fk
    FOREIGN KEY (provider_lead_id)
    REFERENCES public.provider_leads(id),

  CONSTRAINT provider_reconciliation_seen_listings_unique
    UNIQUE (reconciliation_job_id, provider_lead_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_reconciliation_seen_job
  ON public.provider_reconciliation_seen_listings (reconciliation_job_id);

-- Infraestrutura interna: sem policies — só service_role tem acesso.
ALTER TABLE public.provider_reconciliation_seen_listings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.provider_reconciliation_seen_listings                   IS 'Listings observados durante uma reconciliação global, para uso na fase de expiração.';
COMMENT ON COLUMN public.provider_reconciliation_seen_listings.external_id       IS 'Denormalizado do Imovirtual — necessário para comparação na fase de expiração.';

COMMIT;
