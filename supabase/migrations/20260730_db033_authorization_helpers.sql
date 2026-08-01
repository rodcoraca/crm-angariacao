BEGIN;

-- =====================================================
-- DB-033
-- AUTHORIZATION HELPERS
-- =====================================================

--------------------------------------------------------
-- has_role()
--------------------------------------------------------

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
        WHERE ur.user_id = auth.uid()
          AND ur.is_primary = true
          AND upper(r.code) = upper(p_role_code)
    );
$$;

REVOKE ALL
ON FUNCTION public.has_role(text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.has_role(text)
TO authenticated;

--------------------------------------------------------
-- can_manage_users()
--------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_manage_users()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role('ADMIN');
$$;

REVOKE ALL
ON FUNCTION public.can_manage_users()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.can_manage_users()
TO authenticated;

--------------------------------------------------------
-- can_view_company_data()
--------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_view_company_data()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        public.has_role('ADMIN');
$$;

REVOKE ALL
ON FUNCTION public.can_view_company_data()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.can_view_company_data()
TO authenticated;

--------------------------------------------------------
-- can_manage_company()
--------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_manage_company()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        public.has_role('ADMIN');
$$;

REVOKE ALL
ON FUNCTION public.can_manage_company()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.can_manage_company()
TO authenticated;

--------------------------------------------------------
-- can_manage_leads()
--------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_manage_leads()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        public.has_role('ADMIN');
$$;

REVOKE ALL
ON FUNCTION public.can_manage_leads()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.can_manage_leads()
TO authenticated;

--------------------------------------------------------
-- Smoke Test
--------------------------------------------------------

DO
$$
BEGIN

    PERFORM public.has_role('ADMIN');
    PERFORM public.can_manage_users();
    PERFORM public.can_view_company_data();
    PERFORM public.can_manage_company();
    PERFORM public.can_manage_leads();

    RAISE NOTICE '';
    RAISE NOTICE '=====================================';
    RAISE NOTICE ' AUTHORIZATION HELPERS';
    RAISE NOTICE '=====================================';
    RAISE NOTICE ' ✓ has_role()';
    RAISE NOTICE ' ✓ can_manage_users()';
    RAISE NOTICE ' ✓ can_view_company_data()';
    RAISE NOTICE ' ✓ can_manage_company()';
    RAISE NOTICE ' ✓ can_manage_leads()';
    RAISE NOTICE '=====================================';
    RAISE NOTICE '';

END;
$$;

COMMIT;