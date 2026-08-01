-- ============================================================
-- DB-037
-- RLS - Tabela public.user_roles
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Ativar RLS
-- ------------------------------------------------------------

ALTER TABLE public.user_roles
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles
    FORCE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Remover policies existentes
-- ------------------------------------------------------------

DROP POLICY IF EXISTS user_roles_select_policy
ON public.user_roles;

DROP POLICY IF EXISTS user_roles_insert_policy
ON public.user_roles;

DROP POLICY IF EXISTS user_roles_update_policy
ON public.user_roles;

DROP POLICY IF EXISTS user_roles_delete_policy
ON public.user_roles;

-- ------------------------------------------------------------
-- SELECT
--
-- O utilizador pode consultar:
--   • os seus próprios papéis
--   • papéis da sua empresa caso seja administrador
-- ------------------------------------------------------------

CREATE POLICY user_roles_select_policy
ON public.user_roles
FOR SELECT
USING (

    user_id = auth.uid()

    OR

    (
        is_admin()
        AND empresa_id = current_empresa_id()
    )

);

-- ------------------------------------------------------------
-- INSERT
--
-- Apenas administradores da empresa.
-- ------------------------------------------------------------

CREATE POLICY user_roles_insert_policy
ON public.user_roles
FOR INSERT
WITH CHECK (

    is_admin()

    AND empresa_id = current_empresa_id()

);

-- ------------------------------------------------------------
-- UPDATE
--
-- Apenas administradores da empresa.
-- ------------------------------------------------------------

CREATE POLICY user_roles_update_policy
ON public.user_roles
FOR UPDATE
USING (

    is_admin()

    AND empresa_id = current_empresa_id()

)

WITH CHECK (

    is_admin()

    AND empresa_id = current_empresa_id()

);

-- ------------------------------------------------------------
-- DELETE
--
-- Apenas administradores da empresa.
-- ------------------------------------------------------------

CREATE POLICY user_roles_delete_policy
ON public.user_roles
FOR DELETE
USING (

    is_admin()

    AND empresa_id = current_empresa_id()

);

COMMIT;