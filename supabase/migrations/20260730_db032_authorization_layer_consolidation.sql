BEGIN;

-- =====================================================
-- DB-032
-- AUTHORIZATION LAYER CONSOLIDATION
-- =====================================================

--------------------------------------------------------
-- current_empresa_id()
--------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT empresa_id
    FROM public.usuarios
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_empresa_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_empresa_id() TO authenticated;

--------------------------------------------------------
-- current_role_id()
--------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_role_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role_id
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND is_primary = true
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_role_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_role_id() TO authenticated;

--------------------------------------------------------
-- is_admin()
--------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role_id = 1
          AND is_primary = true
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

--------------------------------------------------------
-- AUDITORIA DA CAMADA DE AUTORIZAÇÃO
--------------------------------------------------------

DO
$$
DECLARE

    v_auth_users              integer;
    v_roles                   integer;
    v_primary_roles           integer;

    v_without_role            integer;
    v_invalid_roles           integer;
    v_invalid_empresa         integer;
    v_duplicate_primary       integer;
    v_duplicate_assignments   integer;

BEGIN

    ----------------------------------------------------
    -- Utilizadores autenticáveis
    ----------------------------------------------------

    SELECT COUNT(*)
      INTO v_auth_users
    FROM public.usuarios u
    INNER JOIN auth.users au
        ON au.id = u.auth_user_id;

    ----------------------------------------------------

    SELECT COUNT(*)
      INTO v_roles
    FROM public.user_roles;

    ----------------------------------------------------

    SELECT COUNT(*)
      INTO v_primary_roles
    FROM public.user_roles
    WHERE is_primary;

    ----------------------------------------------------
    -- Utilizadores autenticáveis sem papel
    ----------------------------------------------------

    SELECT COUNT(*)
      INTO v_without_role
    FROM public.usuarios u
    INNER JOIN auth.users au
        ON au.id = u.auth_user_id
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = u.auth_user_id
    );

    IF v_without_role > 0 THEN
        RAISE EXCEPTION
            'DB-032: existem % utilizadores autenticáveis sem papel.',
            v_without_role;
    END IF;

    ----------------------------------------------------
    -- Role inexistente
    ----------------------------------------------------

    SELECT COUNT(*)
      INTO v_invalid_roles
    FROM public.user_roles ur
    LEFT JOIN public.roles r
        ON r.id = ur.role_id
    WHERE r.id IS NULL;

    IF v_invalid_roles > 0 THEN
        RAISE EXCEPTION
            'DB-032: existem roles inválidos.';
    END IF;

    ----------------------------------------------------
    -- Empresa inexistente
    ----------------------------------------------------

    SELECT COUNT(*)
      INTO v_invalid_empresa
    FROM public.user_roles ur
    LEFT JOIN public.empresas e
        ON e.id = ur.empresa_id
    WHERE ur.empresa_id IS NOT NULL
      AND e.id IS NULL;

    IF v_invalid_empresa > 0 THEN
        RAISE EXCEPTION
            'DB-032: existem empresas inválidas.';
    END IF;

    ----------------------------------------------------
    -- Mais de um papel principal
    ----------------------------------------------------

    SELECT COUNT(*)
      INTO v_duplicate_primary
    FROM (
        SELECT user_id
        FROM public.user_roles
        WHERE is_primary
        GROUP BY user_id
        HAVING COUNT(*) > 1
    ) t;

    IF v_duplicate_primary > 0 THEN
        RAISE EXCEPTION
            'DB-032: existem utilizadores com múltiplos papéis principais.';
    END IF;

    ----------------------------------------------------
    -- Duplicações
    ----------------------------------------------------

    SELECT COUNT(*)
      INTO v_duplicate_assignments
    FROM (
        SELECT user_id,
               role_id,
               empresa_id
        FROM public.user_roles
        GROUP BY user_id,
                 role_id,
                 empresa_id
        HAVING COUNT(*) > 1
    ) t;

    IF v_duplicate_assignments > 0 THEN
        RAISE EXCEPTION
            'DB-032: existem papéis duplicados.';
    END IF;

    ----------------------------------------------------
    -- Relatório
    ----------------------------------------------------

    RAISE NOTICE '';
    RAISE NOTICE '=============================================';
    RAISE NOTICE ' OSFLOW AUTHORIZATION AUDIT';
    RAISE NOTICE '=============================================';
    RAISE NOTICE ' Utilizadores autenticáveis : %', v_auth_users;
    RAISE NOTICE ' Papéis atribuídos          : %', v_roles;
    RAISE NOTICE ' Papéis principais          : %', v_primary_roles;
    RAISE NOTICE '';
    RAISE NOTICE ' ✓ Sem utilizadores órfãos';
    RAISE NOTICE ' ✓ Sem papéis inválidos';
    RAISE NOTICE ' ✓ Sem empresas inválidas';
    RAISE NOTICE ' ✓ Sem duplicações';
    RAISE NOTICE ' ✓ Auditoria concluída';
    RAISE NOTICE '=============================================';
    RAISE NOTICE '';

END;
$$;

COMMIT;