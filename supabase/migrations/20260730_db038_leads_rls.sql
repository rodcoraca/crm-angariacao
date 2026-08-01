-- ============================================================
-- DB-038
-- RLS - Tabela public.leads
-- ============================================================

BEGIN;

---------------------------------------------------------------
-- Ativar RLS
---------------------------------------------------------------

ALTER TABLE public.leads
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.leads
    FORCE ROW LEVEL SECURITY;

---------------------------------------------------------------
-- Remover policies existentes
---------------------------------------------------------------

DROP POLICY IF EXISTS leads_select_policy
ON public.leads;

DROP POLICY IF EXISTS leads_insert_policy
ON public.leads;

DROP POLICY IF EXISTS leads_update_policy
ON public.leads;

DROP POLICY IF EXISTS leads_delete_policy
ON public.leads;

---------------------------------------------------------------
-- SELECT
---------------------------------------------------------------

CREATE POLICY leads_select_policy
ON public.leads
FOR SELECT
USING (

    empresa_id = current_empresa_id()

);

---------------------------------------------------------------
-- INSERT
---------------------------------------------------------------

CREATE POLICY leads_insert_policy
ON public.leads
FOR INSERT
WITH CHECK (

    empresa_id = current_empresa_id()

);

---------------------------------------------------------------
-- UPDATE
---------------------------------------------------------------

CREATE POLICY leads_update_policy
ON public.leads
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

CREATE POLICY leads_delete_policy
ON public.leads
FOR DELETE
USING (

    empresa_id = current_empresa_id()

    AND

    is_admin()

);

COMMIT;