BEGIN;

-- =====================================================
-- DB-035
-- RLS - USUARIOS
-- =====================================================

--------------------------------------------------------
-- Enable RLS
--------------------------------------------------------

ALTER TABLE public.usuarios
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.usuarios
FORCE ROW LEVEL SECURITY;

--------------------------------------------------------
-- Remove antigas policies (idempotente)
--------------------------------------------------------

DROP POLICY IF EXISTS usuarios_select ON public.usuarios;
DROP POLICY IF EXISTS usuarios_insert ON public.usuarios;
DROP POLICY IF EXISTS usuarios_update ON public.usuarios;
DROP POLICY IF EXISTS usuarios_delete ON public.usuarios;

--------------------------------------------------------
-- SELECT
--------------------------------------------------------

CREATE POLICY usuarios_select
ON public.usuarios
FOR SELECT
TO authenticated
USING (

    public.can_manage_users()

    OR

    public.owns_user(auth_user_id)

);

--------------------------------------------------------
-- UPDATE
--------------------------------------------------------

CREATE POLICY usuarios_update
ON public.usuarios
FOR UPDATE
TO authenticated
USING (

    public.can_manage_users()

    OR

    public.owns_user(auth_user_id)

)

WITH CHECK (

    public.can_manage_users()

    OR

    public.owns_user(auth_user_id)

);

--------------------------------------------------------
-- INSERT
--------------------------------------------------------

CREATE POLICY usuarios_insert
ON public.usuarios
FOR INSERT
TO authenticated
WITH CHECK (

    public.can_manage_users()

);

--------------------------------------------------------
-- DELETE
--------------------------------------------------------

CREATE POLICY usuarios_delete
ON public.usuarios
FOR DELETE
TO authenticated
USING (

    public.can_manage_users()

);

COMMIT;