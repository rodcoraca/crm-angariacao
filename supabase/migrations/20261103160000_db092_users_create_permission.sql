-- DB-092: Corrige a ausência da permissão users.create.
-- Garante a existência da permissão e a sua associação ao ADMIN.
-- Não altera permissões de outros papéis.

BEGIN;

-- 1. Criar ou regularizar a permissão.
INSERT INTO public.permissions (
    module,
    action,
    code,
    description,
    is_active
)
VALUES (
    'users',
    'create',
    'users.create',
    'Permite criar utilizadores.',
    true
)
ON CONFLICT (code) DO UPDATE
SET
    module = EXCLUDED.module,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = now();

-- 2. Associar exclusivamente ao papel ADMIN.
INSERT INTO public.role_permissions (
    role_id,
    permission_id
)
SELECT
    r.id,
    p.id
FROM public.roles r
JOIN public.permissions p
    ON p.code = 'users.create'
WHERE upper(r.code) = 'ADMIN'
  AND r.is_active = true
  AND p.is_active = true
ON CONFLICT DO NOTHING;

-- 3. Validar a integridade da correção.
DO $$
DECLARE
    v_admin_count integer;
    v_permission_id uuid;
BEGIN
    SELECT count(*)
    INTO v_admin_count
    FROM public.roles
    WHERE upper(code) = 'ADMIN'
      AND is_active = true;

    IF v_admin_count <> 1 THEN
        RAISE EXCEPTION
            'Expected exactly one active ADMIN role, found %',
            v_admin_count;
    END IF;

    SELECT id
    INTO v_permission_id
    FROM public.permissions
    WHERE code = 'users.create'
      AND is_active = true;

    IF v_permission_id IS NULL THEN
        RAISE EXCEPTION 'users.create permission missing or inactive';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.role_permissions rp
        JOIN public.roles r ON r.id = rp.role_id
        WHERE rp.role_id = (
            SELECT id
            FROM public.roles
            WHERE upper(code) = 'ADMIN'
              AND is_active = true
        )
        AND rp.permission_id = v_permission_id
    ) THEN
        RAISE EXCEPTION
            'users.create was not assigned to ADMIN';
    END IF;
END;
$$;

COMMIT;