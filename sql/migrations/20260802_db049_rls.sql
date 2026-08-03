BEGIN;

ALTER TABLE provider_sync_jobs
ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- SELECT
---------------------------------------------------------

DROP POLICY IF EXISTS provider_sync_jobs_select
ON provider_sync_jobs;

CREATE POLICY provider_sync_jobs_select
ON provider_sync_jobs
FOR SELECT
TO authenticated
USING (
    empresa_id IN (
        SELECT empresa_id
        FROM usuarios
        WHERE auth_user_id = auth.uid()
          AND ativo = true
    )
);

---------------------------------------------------------
-- INSERT
---------------------------------------------------------

DROP POLICY IF EXISTS provider_sync_jobs_insert
ON provider_sync_jobs;

CREATE POLICY provider_sync_jobs_insert
ON provider_sync_jobs
FOR INSERT
TO authenticated, service_role
WITH CHECK (
    empresa_id IN (
        SELECT empresa_id
        FROM usuarios
        WHERE auth_user_id = auth.uid()
          AND ativo = true
    )
);

---------------------------------------------------------
-- UPDATE
---------------------------------------------------------

DROP POLICY IF EXISTS provider_sync_jobs_update
ON provider_sync_jobs;

CREATE POLICY provider_sync_jobs_update
ON provider_sync_jobs
FOR UPDATE
TO authenticated, service_role
USING (
    empresa_id IN (
        SELECT empresa_id
        FROM usuarios
        WHERE auth_user_id = auth.uid()
          AND ativo = true
    )
)
WITH CHECK (
    empresa_id IN (
        SELECT empresa_id
        FROM usuarios
        WHERE auth_user_id = auth.uid()
          AND ativo = true
    )
);

COMMIT;