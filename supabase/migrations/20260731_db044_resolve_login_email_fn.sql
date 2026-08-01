BEGIN;

-- =====================================================
-- DB-044
-- Função pública para resolução de email por username
-- Necessária para login por username antes da autenticação
-- (RLS em usuarios só permite authenticated; esta função
--  usa SECURITY DEFINER para contornar esse bloqueio de
--  forma segura, expondo apenas o email pelo username.)
-- =====================================================

DROP FUNCTION IF EXISTS public.resolve_login_email(TEXT);

CREATE FUNCTION public.resolve_login_email(p_login TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT email
  FROM public.usuarios
  WHERE username ILIKE trim(p_login)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_login_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(TEXT) TO authenticated;

COMMIT;
