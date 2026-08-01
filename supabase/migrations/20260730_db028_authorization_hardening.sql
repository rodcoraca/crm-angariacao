-- ============================================================
-- DB-028
-- Authorization Hardening (Estrutura)
-- OSFlow ERP
--
-- Objetivo:
--   - Garantir integridade estrutural do sistema de autorização
--   - NÃO alterar permissões dos utilizadores
--   - Preparar a base para RLS
--
-- ============================================================

BEGIN;

---------------------------------------------------------------
-- 1. Validação estrutural
---------------------------------------------------------------

DO $$
BEGIN

    -- Existem utilizadores sem auth_user_id?
    IF EXISTS (
        SELECT 1
        FROM public.usuarios
        WHERE auth_user_id IS NULL
    ) THEN
        RAISE EXCEPTION
        'DB-028: Existem utilizadores sem auth_user_id.';
    END IF;

    -- Existem utilizadores sem empresa?
    IF EXISTS (
        SELECT 1
        FROM public.usuarios
        WHERE empresa_id IS NULL
    ) THEN
        RAISE EXCEPTION
        'DB-028: Existem utilizadores sem empresa.';
    END IF;

END;
$$;

---------------------------------------------------------------
-- 2. FK user_roles -> auth.users
---------------------------------------------------------------

DO $$
BEGIN

IF NOT EXISTS (

    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name='user_roles_user_id_fkey'

) THEN

    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

END IF;

END;
$$;

---------------------------------------------------------------
-- 3. FK user_roles -> empresas
---------------------------------------------------------------

DO $$
BEGIN

IF NOT EXISTS (

    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name='user_roles_empresa_id_fkey'

) THEN

    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_empresa_id_fkey
    FOREIGN KEY (empresa_id)
    REFERENCES public.empresas(id)
    ON DELETE CASCADE;

END IF;

END;
$$;

---------------------------------------------------------------
-- 4. current_usuario_id()
---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_usuario_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS
$$
SELECT id
FROM usuarios
WHERE auth_user_id = auth.uid()
AND ativo = true
AND account_status = 'active'
LIMIT 1;
$$;

REVOKE ALL
ON FUNCTION public.current_usuario_id()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.current_usuario_id()
TO authenticated;

---------------------------------------------------------------
-- 5. current_role_id()
---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_role_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS
$$
SELECT role_id
FROM user_roles
WHERE user_id = auth.uid()
ORDER BY is_primary DESC,
created_at
LIMIT 1;
$$;

REVOKE ALL
ON FUNCTION public.current_role_id()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.current_role_id()
TO authenticated;

---------------------------------------------------------------
-- 6. is_admin()
---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS
$$
SELECT EXISTS (

    SELECT 1
    FROM user_roles

    WHERE user_id = auth.uid()
    AND role_id = 1

);
$$;

REVOKE ALL
ON FUNCTION public.is_admin()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.is_admin()
TO authenticated;

---------------------------------------------------------------
-- 7. Auditoria
---------------------------------------------------------------

DO $$
DECLARE

    total_users integer;
    total_roles integer;

BEGIN

    SELECT COUNT(*)
    INTO total_users
    FROM usuarios;

    SELECT COUNT(DISTINCT user_id)
    INTO total_roles
    FROM user_roles;

    RAISE NOTICE '==============================';
    RAISE NOTICE 'DB-028 EXECUTADA';
    RAISE NOTICE 'Utilizadores........: %', total_users;
    RAISE NOTICE 'Com papéis..........: %', total_roles;
    RAISE NOTICE 'Sem papéis..........: %', total_users-total_roles;
    RAISE NOTICE '==============================';

END;
$$;

COMMIT;