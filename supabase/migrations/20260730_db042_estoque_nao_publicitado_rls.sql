-- ============================================================
-- DB-042
-- RLS - Tabela public.estoque_nao_publicitado
-- ============================================================

BEGIN;

---------------------------------------------------------------
-- Ativar RLS
---------------------------------------------------------------

ALTER TABLE public.estoque_nao_publicitado
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.estoque_nao_publicitado
    FORCE ROW LEVEL SECURITY;

---------------------------------------------------------------
-- Remover policies existentes
---------------------------------------------------------------

DROP POLICY IF EXISTS estoque_nao_publicitado_select_policy
ON public.estoque_nao_publicitado;

DROP POLICY IF EXISTS estoque_nao_publicitado_insert_policy
ON public.estoque_nao_publicitado;

DROP POLICY IF EXISTS estoque_nao_publicitado_update_policy
ON public.estoque_nao_publicitado;

DROP POLICY IF EXISTS estoque_nao_publicitado_delete_policy
ON public.estoque_nao_publicitado;

---------------------------------------------------------------
-- SELECT
---------------------------------------------------------------

CREATE POLICY estoque_nao_publicitado_select_policy
ON public.estoque_nao_publicitado
FOR SELECT
USING (

    empresa_id = current_empresa_id()

);

---------------------------------------------------------------
-- INSERT
---------------------------------------------------------------

CREATE POLICY estoque_nao_publicitado_insert_policy
ON public.estoque_nao_publicitado
FOR INSERT
WITH CHECK (

    empresa_id = current_empresa_id()

);

---------------------------------------------------------------
-- UPDATE
---------------------------------------------------------------

CREATE POLICY estoque_nao_publicitado_update_policy
ON public.estoque_nao_publicitado
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

CREATE POLICY estoque_nao_publicitado_delete_policy
ON public.estoque_nao_publicitado
FOR DELETE
USING (

    empresa_id = current_empresa_id()

    AND

    is_admin()

);

COMMIT;