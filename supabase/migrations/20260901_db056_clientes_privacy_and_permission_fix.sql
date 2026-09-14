-- ============================================================
-- DB-056
-- Correção de permissão e privacidade do cadastro de clientes
-- ============================================================

BEGIN;

---------------------------------------------------------------
-- Utilitário: perfil do utilizador autenticado
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
-- Utilitário: acesso aos campos privados do cliente
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
-- Gatilho para preencher created_by/updated_by no momento de criação
---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_clientes_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by := public.current_user_profile_id();
    END IF;

    IF NEW.updated_by IS NULL THEN
        NEW.updated_by := public.current_user_profile_id();
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.created_at := COALESCE(NEW.created_at, now());
        NEW.updated_at := COALESCE(NEW.updated_at, now());
    END IF;

    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at := now();
        NEW.updated_by := COALESCE(NEW.updated_by, public.current_user_profile_id());
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
-- View segura para mascarar dados privados sem quebrar o restante cadastro
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
    CASE
        WHEN public.clientes_private_data_visible(c.id) THEN c.telefone_fixo
        ELSE NULL
    END AS telefone_fixo,
    CASE
        WHEN public.clientes_private_data_visible(c.id) THEN c.telefone_movel
        ELSE NULL
    END AS telefone_movel,
    CASE
        WHEN public.clientes_private_data_visible(c.id) THEN c.email
        ELSE NULL
    END AS email,
    c.morada,
    c.numero_policia,
    c.complemento,
    CASE
        WHEN public.clientes_private_data_visible(c.id) THEN c.contacto_1
        ELSE NULL
    END AS contacto_1,
    CASE
        WHEN public.clientes_private_data_visible(c.id) THEN c.telemovel_contacto_1
        ELSE NULL
    END AS telemovel_contacto_1,
    CASE
        WHEN public.clientes_private_data_visible(c.id) THEN c.email_contacto_1
        ELSE NULL
    END AS email_contacto_1,
    CASE
        WHEN public.clientes_private_data_visible(c.id) THEN c.contacto_2
        ELSE NULL
    END AS contacto_2,
    CASE
        WHEN public.clientes_private_data_visible(c.id) THEN c.telemovel_contacto_2
        ELSE NULL
    END AS telemovel_contacto_2,
    CASE
        WHEN public.clientes_private_data_visible(c.id) THEN c.email_contacto_2
        ELSE NULL
    END AS email_contacto_2
FROM public.clientes c
WHERE c.empresa_id = public.current_empresa_id();

REVOKE ALL ON TABLE public.clientes_seguro FROM PUBLIC;
GRANT SELECT ON TABLE public.clientes_seguro TO authenticated;

---------------------------------------------------------------
-- RLS mantem o isolamento do tenant para a tabela base
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
