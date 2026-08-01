-- ============================================================
-- DB-036
-- RLS - Tabela public.empresas
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Ativar RLS
-- ------------------------------------------------------------

ALTER TABLE public.empresas
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.empresas
    FORCE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Remover policies antigas (caso existam)
-- ------------------------------------------------------------

DROP POLICY IF EXISTS empresas_select_policy
ON public.empresas;

DROP POLICY IF EXISTS empresas_update_policy
ON public.empresas;

DROP POLICY IF EXISTS empresas_insert_policy
ON public.empresas;

DROP POLICY IF EXISTS empresas_delete_policy
ON public.empresas;

-- ------------------------------------------------------------
-- SELECT
-- Cada utilizador apenas pode consultar
-- a empresa à qual pertence.
-- Administradores mantêm acesso.
-- ------------------------------------------------------------

CREATE POLICY empresas_select_policy
ON public.empresas
FOR SELECT
USING (

    is_admin()

    OR

    id = current_empresa_id()

);

-- ------------------------------------------------------------
-- UPDATE
-- Apenas administradores podem alterar
-- a própria empresa.
-- ------------------------------------------------------------

CREATE POLICY empresas_update_policy
ON public.empresas
FOR UPDATE
USING (

    is_admin()

    AND

    id = current_empresa_id()

)

WITH CHECK (

    is_admin()

    AND

    id = current_empresa_id()

);

-- ------------------------------------------------------------
-- INSERT
-- Apenas administradores.
-- (Na Beta não existe criação de empresas
-- pelo frontend.)
-- ------------------------------------------------------------

CREATE POLICY empresas_insert_policy
ON public.empresas
FOR INSERT
WITH CHECK (

    is_admin()

);

-- ------------------------------------------------------------
-- DELETE
-- Bloqueado para todos.
-- Empresas não devem ser removidas
-- durante a Beta.
-- ------------------------------------------------------------

CREATE POLICY empresas_delete_policy
ON public.empresas
FOR DELETE
USING (

    FALSE

);

COMMIT;