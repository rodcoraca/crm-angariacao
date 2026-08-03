-- DB-047: Provider Job Engine Foundation (RC1.6.0.1 / ADR-003)
-- Cria a tabela provider_sync_jobs para persistência do ciclo de vida dos jobs.
-- Sem alteração de RLS, RBAC ou políticas existentes.

BEGIN;

CREATE TABLE IF NOT EXISTS public.provider_sync_jobs (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id    UUID        NOT NULL,
  provider      TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'running',
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  progress      JSONB       NOT NULL DEFAULT '{"processed":0,"total":0,"imported":0,"updated":0,"ignored":0,"errors":0}',
  result        JSONB,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT provider_sync_jobs_status_check
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_provider_sync_jobs_lookup
  ON public.provider_sync_jobs (empresa_id, provider, status);

CREATE INDEX IF NOT EXISTS idx_provider_sync_jobs_history
  ON public.provider_sync_jobs (empresa_id, started_at DESC);

-- RLS: acessível apenas via service_role (Edge Function)
ALTER TABLE public.provider_sync_jobs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.provider_sync_jobs                IS 'Registo de execuções de sincronização de providers (Provider Job Engine - ADR-003).';
COMMENT ON COLUMN public.provider_sync_jobs.status         IS 'running | completed | failed | cancelled';
COMMENT ON COLUMN public.provider_sync_jobs.progress       IS 'Estatísticas progressivas: processed, total, imported, updated, ignored, errors.';
COMMENT ON COLUMN public.provider_sync_jobs.result         IS 'Resultado final serializado da sincronização.';
COMMENT ON COLUMN public.provider_sync_jobs.error_message  IS 'Mensagem de erro em caso de falha.';

COMMIT;
