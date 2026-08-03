BEGIN;

-- Perfis da mesma empresa devem estar disponíveis para resolver o
-- responsável apresentado nas Leads. Esta policy é apenas de leitura.
DROP POLICY IF EXISTS usuarios_select ON public.usuarios;

CREATE POLICY usuarios_select
ON public.usuarios
FOR SELECT
TO authenticated
USING (
  public.can_manage_users()
  OR public.owns_user(auth_user_id)
  OR public.same_company(empresa_id)
);

COMMIT;
