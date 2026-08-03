-- ============================================================
-- DB-048
-- Provider Job Engine - Evolução da provider_sync_jobs
-- ADR-003 Revisão 1
-- ============================================================

BEGIN;

---------------------------------------------------------------
-- 1. Novas colunas
---------------------------------------------------------------

ALTER TABLE provider_sync_jobs
ADD COLUMN IF NOT EXISTS phase TEXT,
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS processed INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS imported INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS ignored INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS errors INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS execution_seconds INTEGER,
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

---------------------------------------------------------------
-- 2. Constraints
---------------------------------------------------------------

DO $$
BEGIN

IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'provider_sync_jobs_status_chk'
) THEN

ALTER TABLE provider_sync_jobs
ADD CONSTRAINT provider_sync_jobs_status_chk
CHECK (
    status IN (
        'queued',
        'running',
        'completed',
        'failed',
        'cancelled'
    )
);

END IF;

END $$;

---------------------------------------------------------------
-- 3. Índices
---------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_provider_sync_jobs_empresa_status
ON provider_sync_jobs (empresa_id, status);

CREATE INDEX IF NOT EXISTS idx_provider_sync_jobs_empresa_provider
ON provider_sync_jobs (empresa_id, provider);

CREATE INDEX IF NOT EXISTS idx_provider_sync_jobs_started
ON provider_sync_jobs (started_at DESC);

---------------------------------------------------------------
-- 4. Backfill
---------------------------------------------------------------

UPDATE provider_sync_jobs
SET
    phase = COALESCE(
        phase,
        CASE status
            WHEN 'queued' THEN 'preparing'
            WHEN 'running' THEN 'processing'
            WHEN 'completed' THEN 'completed'
            WHEN 'failed' THEN 'failed'
            WHEN 'cancelled' THEN 'cancelled'
            ELSE 'idle'
        END
    );

---------------------------------------------------------------
-- 5. Comentários
---------------------------------------------------------------

COMMENT ON TABLE provider_sync_jobs IS
'Provider Job Engine - Estado persistente das sincronizações de providers (ADR-003).';

COMMENT ON COLUMN provider_sync_jobs.phase IS
'Fase actual da sincronização.';

COMMENT ON COLUMN provider_sync_jobs.message IS
'Mensagem apresentada à interface.';

COMMENT ON COLUMN provider_sync_jobs.metadata IS
'Informação complementar específica do provider.';

COMMIT;