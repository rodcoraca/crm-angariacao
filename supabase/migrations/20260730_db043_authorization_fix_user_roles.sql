-- ============================================================
-- DB-043
-- Correção da camada de autorização
--
-- Objetivos:
-- 1. Utilizar usuarios.id em vez de auth.uid() na tabela user_roles
-- 2. Eliminar dependência do role_id = 1
-- 3. Uniformizar toda a camada RBAC
-- ============================================================

BEGIN;

---------------------------------------------------------------
-- has_role(text)
---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_role(p_role_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT EXISTS (

    SELECT 1
    FROM public.user_roles ur
    INNER JOIN public.roles r
        ON r.id = ur.role_id

    WHERE ur.user_id = public.current_usuario_id()
      AND ur.is_primary = true
      AND upper(r.code) = upper(p_role_code)

);
$$;

---------------------------------------------------------------
-- is_admin()
---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT public.has_role('ADMIN');
$$;

---------------------------------------------------------------
-- can_manage_users()
---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_manage_users()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT public.has_role('ADMIN');
$$;

COMMIT;