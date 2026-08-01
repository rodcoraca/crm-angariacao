-- ============================================================
-- DB-030
-- User Roles Initial Assignment
-- OSFlow ERP
--
-- Objetivo:
--   - Garantir que todos os utilizadores possuem um papel
--   - Preservar papéis já existentes
--   - Não criar duplicados
--
-- ============================================================

BEGIN;

---------------------------------------------------------------
-- Validação prévia
---------------------------------------------------------------

DO
$$
BEGIN

    IF EXISTS (
        SELECT 1
        FROM public.usuarios
        WHERE auth_user_id IS NULL
    ) THEN
        RAISE EXCEPTION
        'DB-030: Existem utilizadores sem auth_user_id.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.usuarios
        WHERE empresa_id IS NULL
    ) THEN
        RAISE EXCEPTION
        'DB-030: Existem utilizadores sem empresa.';
    END IF;

END;
$$;

---------------------------------------------------------------
-- Inserir papéis apenas para utilizadores autenticáveis
---------------------------------------------------------------

INSERT INTO public.user_roles
(
    id,
    user_id,
    role_id,
    empresa_id,
    is_primary,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    u.auth_user_id,
    3,                      -- Consultor
    u.empresa_id,
    true,
    now(),
    now()

FROM public.usuarios u

INNER JOIN auth.users au
    ON au.id = u.auth_user_id

WHERE NOT EXISTS (

    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = u.auth_user_id

);

---------------------------------------------------------------
-- Garantir apenas um papel principal
---------------------------------------------------------------

DO
$$
BEGIN

    IF EXISTS (

        SELECT
            user_id,
            empresa_id
        FROM public.user_roles
        WHERE is_primary = true
        GROUP BY
            user_id,
            empresa_id
        HAVING COUNT(*) > 1

    ) THEN

        RAISE EXCEPTION
        'DB-030: Existem múltiplos papéis principais.';

    END IF;

END;
$$;

---------------------------------------------------------------
-- Auditoria final
---------------------------------------------------------------

DO
$$
DECLARE

    v_total_auth_users integer;
    v_total_roles integer;

BEGIN

    SELECT COUNT(*)
      INTO v_total_auth_users
    FROM public.usuarios u
    INNER JOIN auth.users au
        ON au.id = u.auth_user_id;

    SELECT COUNT(DISTINCT user_id)
      INTO v_total_roles
    FROM public.user_roles;

    IF v_total_auth_users <> v_total_roles THEN

        RAISE EXCEPTION
        'DB-030: Nem todos os utilizadores autenticáveis possuem um papel.';

    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'DB-030 EXECUTADA COM SUCESSO';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Utilizadores autenticáveis... %', v_total_auth_users;
    RAISE NOTICE 'User Roles................... %', v_total_roles;
    RAISE NOTICE '=========================================';
    RAISE NOTICE '';

END;
$$;