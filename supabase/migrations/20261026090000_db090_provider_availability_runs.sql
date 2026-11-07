BEGIN;

CREATE TABLE IF NOT EXISTS public.provider_availability_runs (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider            text        NOT NULL,
  status              text        NOT NULL DEFAULT 'running',
  started_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,
  checked_count       integer     NOT NULL DEFAULT 0,
  available_count     integer     NOT NULL DEFAULT 0,
  inactivated_count   integer     NOT NULL DEFAULT 0,
  inconclusive_count  integer     NOT NULL DEFAULT 0,
  error_count         integer     NOT NULL DEFAULT 0,
  error_details       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_availability_runs_status_check
    CHECK (status IN ('running', 'completed', 'failed')),
  CONSTRAINT provider_availability_runs_counts_check
    CHECK (checked_count >= 0 AND available_count >= 0 AND inactivated_count >= 0 AND inconclusive_count >= 0 AND error_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_availability_runs_running
  ON public.provider_availability_runs (provider)
  WHERE status = 'running';

CREATE INDEX IF NOT EXISTS idx_provider_availability_runs_history
  ON public.provider_availability_runs (provider, started_at DESC);

ALTER TABLE public.provider_availability_runs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.provider_availability_runs IS
  'Execuções internas da verificação de disponibilidade dos provider_leads.';

COMMIT;
