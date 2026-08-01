-- ============================================================
-- DB-039
-- RLS - Tabela public.provider_leads
-- ============================================================

BEGIN;

---------------------------------------------------------------
-- Ativar RLS
---------------------------------------------------------------

ALTER TABLE public.provider_leads
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.provider_leads
    FORCE ROW LEVEL SECURITY;

---------------------------------------------------------------
-- Remover policies existentes
---------------------------------------------------------------

DROP POLICY IF EXISTS provider_leads_select_policy
ON public.provider_leads;

DROP POLICY IF EXISTS provider_leads_insert_policy
ON public.provider_leads;

DROP POLICY IF EXISTS provider_leads_update_policy
ON public.provider_leads;

DROP POLICY IF EXISTS provider_leads_delete_policy
ON public.provider_leads;

---------------------------------------------------------------
-- SELECT
---------------------------------------------------------------

CREATE POLICY provider_leads_select_policy
ON public.provider_leads
FOR SELECT
USING (

    empresa_id = current_empresa_id()

);

---------------------------------------------------------------
-- INSERT
---------------------------------------------------------------

CREATE POLICY provider_leads_insert_policy
ON public.provider_leads
FOR INSERT
WITH CHECK (

    empresa_id = current_empresa_id()

);

---------------------------------------------------------------
-- UPDATE
---------------------------------------------------------------

CREATE POLICY provider_leads_update_policy
ON public.provider_leads
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

CREATE POLICY provider_leads_delete_policy
ON public.provider_leads
FOR DELETE
USING (

    empresa_id = current_empresa_id()

    AND

    is_admin()

);

COMMIT;