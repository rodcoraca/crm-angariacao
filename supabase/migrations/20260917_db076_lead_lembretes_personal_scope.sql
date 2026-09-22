-- DB-076: isolamento pessoal dos lembretes de Leads.
-- Um lembrete pertence ao perfil que o criou, dentro da empresa.

BEGIN;

DO
$$
DECLARE
    v_orphan_count bigint;
BEGIN
    SELECT count(*)
    INTO v_orphan_count
    FROM public.lead_lembretes
    WHERE criado_por IS NULL;

    IF v_orphan_count > 0 THEN
        RAISE WARNING 'DB-076: existem % lembretes sem criado_por; nenhum proprietario sera atribuido.', v_orphan_count;
    END IF;
END;
$$;

DROP POLICY IF EXISTS lead_lembretes_select_policy
ON public.lead_lembretes;

DROP POLICY IF EXISTS lead_lembretes_insert_policy
ON public.lead_lembretes;

DROP POLICY IF EXISTS lead_lembretes_update_policy
ON public.lead_lembretes;

DROP POLICY IF EXISTS lead_lembretes_delete_policy
ON public.lead_lembretes;

CREATE POLICY lead_lembretes_select_policy
ON public.lead_lembretes
FOR SELECT
USING (
    empresa_id = public.current_empresa_id()
    AND criado_por = public.current_user_profile_id()
);

CREATE POLICY lead_lembretes_insert_policy
ON public.lead_lembretes
FOR INSERT
WITH CHECK (
    empresa_id = public.current_empresa_id()
    AND criado_por = public.current_user_profile_id()
);

CREATE POLICY lead_lembretes_update_policy
ON public.lead_lembretes
FOR UPDATE
USING (
    empresa_id = public.current_empresa_id()
    AND criado_por = public.current_user_profile_id()
)
WITH CHECK (
    empresa_id = public.current_empresa_id()
    AND criado_por = public.current_user_profile_id()
);

CREATE POLICY lead_lembretes_delete_policy
ON public.lead_lembretes
FOR DELETE
USING (
    empresa_id = public.current_empresa_id()
    AND criado_por = public.current_user_profile_id()
);

DROP INDEX IF EXISTS public.idx_lead_lembretes_unico_ativo;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_lembretes_unico_ativo_por_utilizador
    ON public.lead_lembretes (lead_id, criado_por)
    WHERE estado = 'ativo'
      AND criado_por IS NOT NULL;

DROP INDEX IF EXISTS public.idx_lead_lembretes_empresa_id;

CREATE INDEX IF NOT EXISTS idx_lead_lembretes_cockpit_owner_date
    ON public.lead_lembretes (empresa_id, criado_por, estado, data_lembrete, hora_lembrete);

COMMIT;
