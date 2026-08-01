BEGIN;

-- =====================================================
-- DB-034
-- AUTHORIZATION PREDICATES
-- =====================================================

--------------------------------------------------------
-- owns_user(auth_user_id)
--------------------------------------------------------

CREATE OR REPLACE FUNCTION public.owns_user(
    p_auth_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() = p_auth_user_id;
$$;

REVOKE ALL
ON FUNCTION public.owns_user(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.owns_user(uuid)
TO authenticated;

--------------------------------------------------------
-- same_company(empresa_id)
--------------------------------------------------------

CREATE OR REPLACE FUNCTION public.same_company(
    p_empresa_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.current_empresa_id() = p_empresa_id;
$$;

REVOKE ALL
ON FUNCTION public.same_company(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.same_company(uuid)
TO authenticated;

--------------------------------------------------------
-- can_access_company(empresa_id)
--------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_access_company(
    p_empresa_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        public.same_company(p_empresa_id)
        AND
        public.can_view_company_data();
$$;

REVOKE ALL
ON FUNCTION public.can_access_company(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.can_access_company(uuid)
TO authenticated;

--------------------------------------------------------
-- can_edit_company(empresa_id)
--------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_edit_company(
    p_empresa_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        public.same_company(p_empresa_id)
        AND
        public.can_manage_company();
$$;

REVOKE ALL
ON FUNCTION public.can_edit_company(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.can_edit_company(uuid)
TO authenticated;

--------------------------------------------------------
-- can_manage_company_user(auth_user_id, empresa_id)
--------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_manage_company_user(
    p_auth_user_id uuid,
    p_empresa_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        (
            public.owns_user(p_auth_user_id)
        )
        OR
        (
            public.can_manage_users()
            AND public.same_company(p_empresa_id)
        );
$$;

REVOKE ALL
ON FUNCTION public.can_manage_company_user(uuid, uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.can_manage_company_user(uuid, uuid)
TO authenticated;

--------------------------------------------------------
-- Smoke Test
--------------------------------------------------------

DO
$$
BEGIN

    PERFORM public.owns_user(auth.uid());
    PERFORM public.same_company(public.current_empresa_id());
    PERFORM public.can_access_company(public.current_empresa_id());
    PERFORM public.can_edit_company(public.current_empresa_id());
    PERFORM public.can_manage_company_user(
        auth.uid(),
        public.current_empresa_id()
    );

    RAISE NOTICE '';
    RAISE NOTICE '=========================================';
    RAISE NOTICE ' AUTHORIZATION PREDICATES';
    RAISE NOTICE '=========================================';
    RAISE NOTICE ' ✓ owns_user()';
    RAISE NOTICE ' ✓ same_company()';
    RAISE NOTICE ' ✓ can_access_company()';
    RAISE NOTICE ' ✓ can_edit_company()';
    RAISE NOTICE ' ✓ can_manage_company_user()';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '';

END;
$$;

COMMIT;