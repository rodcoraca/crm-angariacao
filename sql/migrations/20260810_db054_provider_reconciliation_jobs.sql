-- ============================================================
-- DB-054
-- Infraestrutura de reconciliação global de provider_leads.
-- Cria provider_reconciliation_jobs para controlo de execuções
-- globais por provider, com suporte a checkpoint e retoma.
-- Não altera nenhuma tabela existente.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.provider_reconciliation_jobs (
  id                   uuid        NOT NULL DEFAULT gen_random_uuid(),
  provider             text        NOT NULL,
  status               text        NOT NULL DEFAULT 'pending',
  started_at           timestamptz,
  completed_at         timestamptz,
  current_page         integer     NOT NULL DEFAULT 0,
  pages_processed      integer     NOT NULL DEFAULT 0,
  last_checkpoint_at   timestamptz,
  error_message        text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT provider_reconciliation_jobs_pkey
    PRIMARY KEY (id),

  CONSTRAINT provider_reconciliation_jobs_status_chk
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),

  CONSTRAINT provider_reconciliation_jobs_provider_not_empty
    CHECK (char_length(trim(provider)) > 0),

  CONSTRAINT provider_reconciliation_jobs_pages_non_negative
    CHECK (current_page >= 0 AND pages_processed >= 0)
);

-- Impede dois jobs activos (pending ou running) para o mesmo provider.
-- Permite histórico ilimitado de execuções completed/failed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_reconciliation_jobs_active_lock
  ON public.provider_reconciliation_jobs (provider)
  WHERE status IN ('pending', 'running');

-- Suporte a pesquisa por provider + estado e ordenação por data.
CREATE INDEX IF NOT EXISTS idx_provider_reconciliation_jobs_provider_status
  ON public.provider_reconciliation_jobs (provider, status);

CREATE INDEX IF NOT EXISTS idx_provider_reconciliation_jobs_created
  ON public.provider_reconciliation_jobs (created_at DESC);

-- Tabela de infraestrutura interna: RLS activo, sem policies permissivas.
-- service_role contorna RLS; utilizadores autenticados não têm acesso.
ALTER TABLE public.provider_reconciliation_jobs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.provider_reconciliation_jobs                   IS 'Controlo de execuções de reconciliação global de provider_leads por provider.';
COMMENT ON COLUMN public.provider_reconciliation_jobs.provider          IS 'Identificador do provider (ex: imovirtual).';
COMMENT ON COLUMN public.provider_reconciliation_jobs.status            IS 'pending | running | completed | failed';
COMMENT ON COLUMN public.provider_reconciliation_jobs.current_page      IS 'Última página processada — permite retomar após shutdown.';
COMMENT ON COLUMN public.provider_reconciliation_jobs.pages_processed   IS 'Total de páginas processadas até ao último checkpoint.';
COMMENT ON COLUMN public.provider_reconciliation_jobs.last_checkpoint_at IS 'Timestamp do último checkpoint gravado.';
COMMENT ON COLUMN public.provider_reconciliation_jobs.error_message     IS 'Mensagem de erro em caso de falha.';

COMMIT;
