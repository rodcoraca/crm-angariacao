BEGIN;

DO $$
DECLARE
  v_target_auth_user_id uuid := 'fc79e949-a7c3-4fcf-91c0-6a2ed2a894d0';
  v_target_usuario_id uuid;
  v_target_empresa_id uuid;
  v_admin_count integer;
  v_admin_role_id integer;
  v_admin_user_role_id uuid;
  v_catalog_count integer;
  v_linked_count integer;
  v_primary_count integer;
  v_primary_admin_count integer;
BEGIN
  SELECT count(*)
  INTO v_admin_count
  FROM public.roles
  WHERE upper(code) = 'ADMIN';

  IF v_admin_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one ADMIN role, found %', v_admin_count;
  END IF;

  SELECT id
  INTO v_admin_role_id
  FROM public.roles
  WHERE upper(code) = 'ADMIN';

  IF NOT EXISTS (
    SELECT 1
    FROM public.roles
    WHERE id = v_admin_role_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ADMIN role is not active';
  END IF;

  SELECT u.id, u.empresa_id
  INTO v_target_usuario_id, v_target_empresa_id
  FROM public.usuarios u
  JOIN auth.users au
    ON au.id = u.auth_user_id
  WHERE u.auth_user_id = v_target_auth_user_id;

  IF v_target_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Target authenticated user is not uniquely linked to usuarios';
  END IF;

  IF (
    SELECT count(*)
    FROM public.usuarios u
    JOIN auth.users au
      ON au.id = u.auth_user_id
    WHERE u.auth_user_id = v_target_auth_user_id
  ) <> 1 THEN
    RAISE EXCEPTION 'Target authenticated user has an ambiguous usuarios link';
  END IF;

    IF v_target_usuario_id IS DISTINCT FROM 'af2eecbf-5d2b-4a11-b23f-a0923848d1d1'::uuid
      OR v_target_empresa_id IS DISTINCT FROM '036d7669-c8ed-44c2-86cc-bf949b54b812'::uuid THEN
    RAISE EXCEPTION 'Target usuario identity does not match the validated administrator';
  END IF;

  INSERT INTO public.permissions (
    module,
    action,
    code,
    description,
    is_active
  )
  VALUES (
    'users',
    'edit',
    'users.edit',
    'Permite editar utilizadores.',
    true
  )
  ON CONFLICT (code) DO UPDATE
  SET
    module = EXCLUDED.module,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = now();

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT
    r.id,
    p.id
  FROM public.roles r
  CROSS JOIN public.permissions p
  WHERE upper(r.code) = 'ADMIN'
    AND r.is_active = true
    AND p.is_active = true
    AND NOT EXISTS (
      SELECT 1
      FROM public.role_permissions rp
      WHERE rp.role_id = r.id
        AND rp.permission_id = p.id
    );

  SELECT ur.id
  INTO v_admin_user_role_id
  FROM public.user_roles ur
  WHERE ur.user_id = v_target_auth_user_id
    AND ur.role_id = v_admin_role_id
    AND ur.empresa_id IS NOT DISTINCT FROM v_target_empresa_id
  ORDER BY ur.id
  LIMIT 1;

  IF v_admin_user_role_id IS NULL THEN
    INSERT INTO public.user_roles (
      user_id,
      role_id,
      empresa_id,
      is_primary,
      created_at,
      updated_at
    )
    VALUES (
      v_target_auth_user_id,
      v_admin_role_id,
      v_target_empresa_id,
      true,
      now(),
      now()
    )
    RETURNING id INTO v_admin_user_role_id;
  ELSE
    UPDATE public.user_roles
    SET is_primary = true,
        updated_at = now()
    WHERE id = v_admin_user_role_id
      AND is_primary IS DISTINCT FROM true;
  END IF;

  UPDATE public.user_roles
  SET is_primary = false,
      updated_at = now()
  WHERE user_id = v_target_auth_user_id
    AND is_primary = true
    AND id <> v_admin_user_role_id;

  SELECT count(*)
  INTO v_catalog_count
  FROM public.permissions
  WHERE is_active = true;

  SELECT count(DISTINCT rp.permission_id)
  INTO v_linked_count
  FROM public.role_permissions rp
  JOIN public.permissions p
    ON p.id = rp.permission_id
  WHERE rp.role_id = v_admin_role_id
    AND p.is_active = true;

  IF v_linked_count <> v_catalog_count THEN
    RAISE EXCEPTION
      'ADMIN permission validation failed: % of % active permissions linked',
      v_linked_count,
      v_catalog_count;
  END IF;

  SELECT count(*)
  INTO v_primary_count
  FROM public.user_roles
  WHERE user_id = v_target_auth_user_id
    AND is_primary = true;

  SELECT count(*)
  INTO v_primary_admin_count
  FROM public.user_roles ur
  JOIN public.roles r
    ON r.id = ur.role_id
  WHERE ur.user_id = v_target_auth_user_id
    AND ur.is_primary = true
    AND upper(r.code) = 'ADMIN';

  IF v_primary_count <> 1 OR v_primary_admin_count <> 1 THEN
    RAISE EXCEPTION
      'Primary ADMIN validation failed: primary_count=%, primary_admin_count=%',
      v_primary_count,
      v_primary_admin_count;
  END IF;

  PERFORM set_config(
    'request.jwt.claim.sub',
    v_target_auth_user_id::text,
    true
  );

  IF NOT public.has_role('ADMIN') THEN
    RAISE EXCEPTION 'has_role(ADMIN) validation failed';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'is_admin() validation failed';
  END IF;

  RAISE NOTICE
    'RBAC ADMIN regularized for usuarios.id %, auth_user_id %, empresa_id %, active_permissions %',
    v_target_usuario_id,
    v_target_auth_user_id,
    v_target_empresa_id,
    v_linked_count;
END;
$$;

COMMIT;

SELECT
  u.id AS usuarios_id,
  u.auth_user_id,
  u.empresa_id,
  r.code AS role_code,
  ur.is_primary,
  ur.empresa_id AS role_empresa_id,
  (
    SELECT count(*)
    FROM public.permissions
    WHERE is_active = true
  ) AS active_permissions,
  (
    SELECT count(DISTINCT rp.permission_id)
    FROM public.role_permissions rp
    JOIN public.permissions p
      ON p.id = rp.permission_id
    WHERE rp.role_id = r.id
      AND p.is_active = true
  ) AS admin_permissions,
  EXISTS (
    SELECT 1
    FROM public.permissions p
    WHERE p.code = 'users.edit'
      AND p.is_active = true
  ) AS users_edit_exists
FROM public.usuarios u
JOIN public.user_roles ur
  ON ur.user_id = u.auth_user_id
JOIN public.roles r
  ON r.id = ur.role_id
WHERE u.auth_user_id = 'fc79e949-a7c3-4fcf-91c0-6a2ed2a894d0'
  AND upper(r.code) = 'ADMIN'
  AND ur.is_primary = true;

SELECT set_config(
  'request.jwt.claim.sub',
  'fc79e949-a7c3-4fcf-91c0-6a2ed2a894d0',
  false
);

SELECT public.has_role('ADMIN');
SELECT public.is_admin();