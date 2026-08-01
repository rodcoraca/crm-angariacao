BEGIN;

-------------------------------------------------------
-- 1. Tornar o Administrador principal
-------------------------------------------------------

UPDATE public.user_roles
SET
    is_primary = true,
    updated_at = now()
WHERE user_id = 'fc79e949-a7c3-4fcf-91c0-6a2ed2a894d0'
  AND role_id = 1;

-------------------------------------------------------
-- 2. Inserir papéis em falta
-------------------------------------------------------

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
    3,
    u.empresa_id,
    true,
    now(),
    now()

FROM public.usuarios u

INNER JOIN auth.users au
    ON au.id = u.auth_user_id

LEFT JOIN public.user_roles ur
    ON ur.user_id = u.auth_user_id

WHERE ur.user_id IS NULL;

-------------------------------------------------------
-- 3. Relatório
-------------------------------------------------------

DO $$
DECLARE
    v_users integer;
    v_roles integer;
BEGIN

    SELECT COUNT(*)
      INTO v_users
    FROM public.usuarios u
    INNER JOIN auth.users au
        ON au.id = u.auth_user_id;

    SELECT COUNT(DISTINCT user_id)
      INTO v_roles
    FROM public.user_roles;

    RAISE NOTICE '===========================';
    RAISE NOTICE 'DB-031 REPAIR CONCLUÍDA';
    RAISE NOTICE 'Utilizadores Auth: %', v_users;
    RAISE NOTICE 'User Roles.......: %', v_roles;
    RAISE NOTICE '===========================';

END $$;

COMMIT;