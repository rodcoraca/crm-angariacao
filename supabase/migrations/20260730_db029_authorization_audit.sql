-- ============================================================
-- DB-029
-- Authorization Audit
-- OSFlow ERP
--
-- Objetivo:
--   - Auditar a integridade da camada de autorização
--   - NÃO alterar qualquer dado
--   - Bloquear a evolução para RLS caso existam inconsistências
--
-- ============================================================

BEGIN;

---------------------------------------------------------------
-- Auditoria
---------------------------------------------------------------

DO
$$
DECLARE

    v_total_users                integer;
    v_users_without_role         integer;
    v_users_without_empresa      integer;
    v_users_without_auth         integer;
    v_invalid_roles             integer;
    v_invalid_auth_users        integer;
    v_duplicate_primary_roles   integer;
    v_duplicate_assignments      integer;

BEGIN

    -----------------------------------------------------------
    -- Totais
    -----------------------------------------------------------

    SELECT COUNT(*)
      INTO v_total_users
    FROM public.usuarios;

    -----------------------------------------------------------
    -- Sem auth_user_id
    -----------------------------------------------------------

    SELECT COUNT(*)
      INTO v_users_without_auth
    FROM public.usuarios
    WHERE auth_user_id IS NULL;

    -----------------------------------------------------------
    -- Sem empresa
    -----------------------------------------------------------

    SELECT COUNT(*)
      INTO v_users_without_empresa
    FROM public.usuarios
    WHERE empresa_id IS NULL;

    -----------------------------------------------------------
    -- Sem papel
    -----------------------------------------------------------

    SELECT COUNT(*)
      INTO v_users_without_role
    FROM public.usuarios u
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = u.auth_user_id
    );

    -----------------------------------------------------------
    -- role inexistente
    -----------------------------------------------------------

    SELECT COUNT(*)
      INTO v_invalid_roles
    FROM public.user_roles ur
    LEFT JOIN public.roles r
           ON r.id = ur.role_id
    WHERE r.id IS NULL;

    -----------------------------------------------------------
    -- auth.users inexistente
    -----------------------------------------------------------

    SELECT COUNT(*)
      INTO v_invalid_auth_users
    FROM public.user_roles ur
    LEFT JOIN auth.users au
           ON au.id = ur.user_id
    WHERE au.id IS NULL;

    -----------------------------------------------------------
    -- Mais de um papel principal
    -----------------------------------------------------------

    SELECT COUNT(*)
      INTO v_duplicate_primary_roles
    FROM (
        SELECT
            user_id,
            empresa_id
        FROM public.user_roles
        WHERE is_primary = true
        GROUP BY user_id, empresa_id
        HAVING COUNT(*) > 1
    ) t;

    -----------------------------------------------------------
    -- Papéis duplicados
    -----------------------------------------------------------

    SELECT COUNT(*)
      INTO v_duplicate_assignments
    FROM (
        SELECT
            user_id,
            empresa_id,
            role_id
        FROM public.user_roles
        GROUP BY
            user_id,
            empresa_id,
            role_id
        HAVING COUNT(*) > 1
    ) t;

    -----------------------------------------------------------
    -- Relatório
    -----------------------------------------------------------

    RAISE NOTICE '';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'DB-029 - AUTHORIZATION AUDIT';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Utilizadores..................... %', v_total_users;
    RAISE NOTICE 'Sem auth_user_id................. %', v_users_without_auth;
    RAISE NOTICE 'Sem empresa...................... %', v_users_without_empresa;
    RAISE NOTICE 'Sem papel........................ %', v_users_without_role;
    RAISE NOTICE 'Roles inválidos................. %', v_invalid_roles;
    RAISE NOTICE 'Auth.users inexistente.......... %', v_invalid_auth_users;
    RAISE NOTICE 'Mais de um papel principal...... %', v_duplicate_primary_roles;
    RAISE NOTICE 'Papéis duplicados............... %', v_duplicate_assignments;
    RAISE NOTICE '=========================================';
    RAISE NOTICE '';

    -----------------------------------------------------------
    -- Bloqueios
    -----------------------------------------------------------

    IF v_users_without_auth > 0 THEN
        RAISE EXCEPTION
        'DB-029 abortada: existem utilizadores sem auth_user_id.';
    END IF;

    IF v_users_without_empresa > 0 THEN
        RAISE EXCEPTION
        'DB-029 abortada: existem utilizadores sem empresa.';
    END IF;

    IF v_invalid_roles > 0 THEN
        RAISE EXCEPTION
        'DB-029 abortada: existem role_id inválidos.';
    END IF;

    IF v_invalid_auth_users > 0 THEN
        RAISE EXCEPTION
        'DB-029 abortada: existem user_roles sem auth.users correspondente.';
    END IF;

    IF v_duplicate_primary_roles > 0 THEN
        RAISE EXCEPTION
        'DB-029 abortada: existem múltiplos papéis principais para o mesmo utilizador.';
    END IF;

    IF v_duplicate_assignments > 0 THEN
        RAISE EXCEPTION
        'DB-029 abortada: existem papéis duplicados.';
    END IF;

    IF v_users_without_role > 0 THEN
        RAISE EXCEPTION
        'DB-029 abortada: existem utilizadores sem qualquer papel atribuído.';
    END IF;

END;
$$;

COMMIT;