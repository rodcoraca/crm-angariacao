-- ============================================================
-- DB-041
-- RLS - Tabela public.imovel_ficheiros
-- ============================================================

BEGIN;

---------------------------------------------------------------
-- Ativar RLS
---------------------------------------------------------------

ALTER TABLE public.imovel_ficheiros
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.imovel_ficheiros
    FORCE ROW LEVEL SECURITY;

---------------------------------------------------------------
-- Remover policies existentes
---------------------------------------------------------------

DROP POLICY IF EXISTS imovel_ficheiros_select_policy
ON public.imovel_ficheiros;

DROP POLICY IF EXISTS imovel_ficheiros_insert_policy
ON public.imovel_ficheiros;

DROP POLICY IF EXISTS imovel_ficheiros_update_policy
ON public.imovel_ficheiros;

DROP POLICY IF EXISTS imovel_ficheiros_delete_policy
ON public.imovel_ficheiros;

---------------------------------------------------------------
-- SELECT
---------------------------------------------------------------

CREATE POLICY imovel_ficheiros_select_policy
ON public.imovel_ficheiros
FOR SELECT
USING (

    empresa_id = current_empresa_id()

);

---------------------------------------------------------------
-- INSERT
---------------------------------------------------------------

CREATE POLICY imovel_ficheiros_insert_policy
ON public.imovel_ficheiros
FOR INSERT
WITH CHECK (

    empresa_id = current_empresa_id()

);

---------------------------------------------------------------
-- UPDATE
---------------------------------------------------------------

CREATE POLICY imovel_ficheiros_update_policy
ON public.imovel_ficheiros
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

CREATE POLICY imovel_ficheiros_delete_policy
ON public.imovel_ficheiros
FOR DELETE
USING (

    empresa_id = current_empresa_id()

    AND

    is_admin()

);

COMMIT;