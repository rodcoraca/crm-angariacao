BEGIN;

REVOKE EXECUTE ON FUNCTION public.resolve_login_email(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_login_email(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_login_email(TEXT) FROM authenticated;

COMMIT;
