-- ============================================================
-- DB-057
-- Correção final da privacidade real e do created_by dos clientes
-- ============================================================

BEGIN;

---------------------------------------------------------------
-- 1) Resolver o utilizador autenticado da tabela public.usuarios
---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id
    FROM public.usuarios
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_profile_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_profile_id() TO authenticated;

---------------------------------------------------------------
-- 2) Permite acesso aos campos privados apenas quando:
--    - mesmo tenant
--    - criado pelo utilizador atual
--    OR - utilizador possui a permissão específica
---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.clientes_private_data_visible(
    p_cliente_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.clientes c
        WHERE c.id = p_cliente_id
          AND c.empresa_id = public.current_empresa_id()
          AND (
                c.created_by = public.current_user_profile_id()
                OR
                COALESCE(
                    (
                        SELECT (u.permissoes ->> 'estoque_nao_publicitado.view_private_data')::boolean
                        FROM public.usuarios u
                        WHERE u.auth_user_id = auth.uid()
                        LIMIT 1
                    ),
                    false
                )
          )
    );
$$;

REVOKE ALL ON FUNCTION public.clientes_private_data_visible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clientes_private_data_visible(uuid) TO authenticated;

---------------------------------------------------------------
-- 3) created_by: preencher apenas na criação e nunca substituir
--    durante UPDATE; updated_by continua a registrar a edição.
---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_clientes_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_by := COALESCE(NEW.created_by, public.current_user_profile_id());
        NEW.updated_by := COALESCE(NEW.updated_by, public.current_user_profile_id());
        NEW.created_at := COALESCE(NEW.created_at, now());
        NEW.updated_at := COALESCE(NEW.updated_at, now());
    END IF;

    IF TG_OP = 'UPDATE' THEN
        NEW.updated_by := COALESCE(NEW.updated_by, public.current_user_profile_id());
        NEW.updated_at := now();
        NEW.created_by := COALESCE(OLD.created_by, NEW.created_by, public.current_user_profile_id());
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clientes_set_audit_fields ON public.clientes;

CREATE TRIGGER clientes_set_audit_fields
BEFORE INSERT OR UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.set_clientes_audit_fields();

---------------------------------------------------------------
-- 4) View segura que protege os campos privados na camada de dados.
--    A tabela base deixa de ficar como caminho de leitura normal.
---------------------------------------------------------------

CREATE OR REPLACE VIEW public.clientes_seguro AS
SELECT
    c.id,
    c.empresa_id,
    c.created_by,
    c.updated_by,
    c.created_at,
    c.updated_at,
    c.responsavel_angariacao,
    c.telefone_responsavel,
    c.email_responsavel,
    c.tipo_cliente,
    c.nome_designacao,
    c.nipc,
    c.ami,
    CASE WHEN public.clientes_private_data_visible(c.id) THEN c.telefone_fixo ELSE NULL END AS telefone_fixo,
    CASE WHEN public.clientes_private_data_visible(c.id) THEN c.telefone_movel ELSE NULL END AS telefone_movel,
    CASE WHEN public.clientes_private_data_visible(c.id) THEN c.email ELSE NULL END AS email,
    c.morada,
    c.numero_policia,
    c.complemento,
    CASE WHEN public.clientes_private_data_visible(c.id) THEN c.contacto_1 ELSE NULL END AS contacto_1,
    CASE WHEN public.clientes_private_data_visible(c.id) THEN c.telemovel_contacto_1 ELSE NULL END AS telemovel_contacto_1,
    CASE WHEN public.clientes_private_data_visible(c.id) THEN c.email_contacto_1 ELSE NULL END AS email_contacto_1,
    CASE WHEN public.clientes_private_data_visible(c.id) THEN c.contacto_2 ELSE NULL END AS contacto_2,
    CASE WHEN public.clientes_private_data_visible(c.id) THEN c.telemovel_contacto_2 ELSE NULL END AS telemovel_contacto_2,
    CASE WHEN public.clientes_private_data_visible(c.id) THEN c.email_contacto_2 ELSE NULL END AS email_contacto_2
FROM public.clientes c
WHERE c.empresa_id = public.current_empresa_id();

REVOKE ALL ON TABLE public.clientes_seguro FROM PUBLIC;
GRANT SELECT ON TABLE public.clientes_seguro TO authenticated;

---------------------------------------------------------------
-- 5) Segurança real na tabela base: remover acesso de leitura direta
--    e permitir apenas escrita que continue sob RLS.
--    A leitura de dados privados deve passar pela view segura.
---------------------------------------------------------------

REVOKE ALL ON TABLE public.clientes FROM PUBLIC;
REVOKE ALL ON TABLE public.clientes FROM authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.clientes TO authenticated;
GRANT SELECT ON TABLE public.clientes_seguro TO authenticated;

---------------------------------------------------------------
-- 6) RLS da tabela base continua preservando tenant scope.
---------------------------------------------------------------

ALTER TABLE public.clientes
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clientes
    FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clientes_select_policy ON public.clientes;
DROP POLICY IF EXISTS clientes_insert_policy ON public.clientes;
DROP POLICY IF EXISTS clientes_update_policy ON public.clientes;
DROP POLICY IF EXISTS clientes_delete_policy ON public.clientes;

CREATE POLICY clientes_select_policy
ON public.clientes
FOR SELECT
USING (
    empresa_id = current_empresa_id()
    AND (
        created_by = public.current_user_profile_id()
        OR
        COALESCE(
            (
                SELECT (u.permissoes ->> 'estoque_nao_publicitado.view_private_data')::boolean
                FROM public.usuarios u
                WHERE u.auth_user_id = auth.uid()
                LIMIT 1
            ),
            false
        )
    )
);

CREATE POLICY clientes_insert_policy
ON public.clientes
FOR INSERT
WITH CHECK (
    empresa_id = current_empresa_id()
);

CREATE POLICY clientes_update_policy
ON public.clientes
FOR UPDATE
USING (
    empresa_id = current_empresa_id()
)
WITH CHECK (
    empresa_id = current_empresa_id()
);

CREATE POLICY clientes_delete_policy
ON public.clientes
FOR DELETE
USING (
    empresa_id = current_empresa_id()
    AND is_admin()
);

COMMIT;
