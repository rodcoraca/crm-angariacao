-- ============================================================
-- DB-040
-- RLS - Tabela public.documentos
-- ============================================================

BEGIN;

---------------------------------------------------------------
-- Ativar RLS
---------------------------------------------------------------

ALTER TABLE public.documentos
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.documentos
    FORCE ROW LEVEL SECURITY;

---------------------------------------------------------------
-- Remover policies existentes
---------------------------------------------------------------

DROP POLICY IF EXISTS documentos_select_policy
ON public.documentos;

DROP POLICY IF EXISTS documentos_insert_policy
ON public.documentos;

DROP POLICY IF EXISTS documentos_update_policy
ON public.documentos;

DROP POLICY IF EXISTS documentos_delete_policy
ON public.documentos;

---------------------------------------------------------------
-- SELECT
---------------------------------------------------------------

CREATE POLICY documentos_select_policy
ON public.documentos
FOR SELECT
USING (

    empresa_id = current_empresa_id()

);

---------------------------------------------------------------
-- INSERT
---------------------------------------------------------------

CREATE POLICY documentos_insert_policy
ON public.documentos
FOR INSERT
WITH CHECK (

    empresa_id = current_empresa_id()

);

---------------------------------------------------------------
-- UPDATE
---------------------------------------------------------------

CREATE POLICY documentos_update_policy
ON public.documentos
FOR UPDATE
USING (

    empresa_id = current_empresa_id()

)

WITH CHECK (

    empresa_id = current_empresa_id()

);

---------------------------------------------------------------
-- DELETE
---------------------------------------------------------------

CREATE POLICY documentos_delete_policy
ON public.documentos
FOR DELETE
USING (

    empresa_id = current_empresa_id()

    AND

    is_admin()

);

COMMIT;