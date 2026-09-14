-- DB-068 - Publicacao e relatorios da escala de servico

BEGIN;

ALTER TABLE public.escalas_servico
    ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'rascunho',
    ADD COLUMN IF NOT EXISTS published_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS published_by uuid NULL;

ALTER TABLE public.escalas_servico
    DROP CONSTRAINT IF EXISTS escalas_servico_estado_check;

ALTER TABLE public.escalas_servico
    ADD CONSTRAINT escalas_servico_estado_check
    CHECK (estado IN ('rascunho', 'publicada'));

ALTER TABLE public.escalas_servico
    DROP CONSTRAINT IF EXISTS escalas_servico_published_by_fk;

ALTER TABLE public.escalas_servico
    ADD CONSTRAINT escalas_servico_published_by_fk
    FOREIGN KEY (published_by)
    REFERENCES public.usuarios(id)
    ON DELETE SET NULL;

ALTER TABLE public.escalas_servico
    DROP CONSTRAINT IF EXISTS escalas_servico_empresa_semana_tipo_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_escalas_servico_unico_rascunho
    ON public.escalas_servico (empresa_id, semana_inicio, tipo)
    WHERE estado = 'rascunho';

DROP POLICY IF EXISTS escalas_servico_update_policy ON public.escalas_servico;
CREATE POLICY escalas_servico_update_policy
ON public.escalas_servico FOR UPDATE
USING (
    empresa_id = current_empresa_id()
    AND estado = 'rascunho'
)
WITH CHECK (
    empresa_id = current_empresa_id()
    AND estado IN ('rascunho', 'publicada')
);

DROP POLICY IF EXISTS escalas_servico_delete_policy ON public.escalas_servico;
CREATE POLICY escalas_servico_delete_policy
ON public.escalas_servico FOR DELETE
USING (
    empresa_id = current_empresa_id()
    AND estado = 'rascunho'
    AND is_admin()
);

DROP POLICY IF EXISTS escalas_servico_linhas_select_policy ON public.escalas_servico_linhas;
CREATE POLICY escalas_servico_linhas_select_policy
ON public.escalas_servico_linhas FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.escalas_servico escala
    WHERE escala.id = escala_id
      AND escala.empresa_id = current_empresa_id()
));

DROP POLICY IF EXISTS escalas_servico_linhas_insert_policy ON public.escalas_servico_linhas;
CREATE POLICY escalas_servico_linhas_insert_policy
ON public.escalas_servico_linhas FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.escalas_servico escala
    WHERE escala.id = escala_id
      AND escala.empresa_id = current_empresa_id()
      AND escala.estado = 'rascunho'
));

DROP POLICY IF EXISTS escalas_servico_linhas_update_policy ON public.escalas_servico_linhas;
CREATE POLICY escalas_servico_linhas_update_policy
ON public.escalas_servico_linhas FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.escalas_servico escala
    WHERE escala.id = escala_id
      AND escala.empresa_id = current_empresa_id()
      AND escala.estado = 'rascunho'
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.escalas_servico escala
    WHERE escala.id = escala_id
      AND escala.empresa_id = current_empresa_id()
      AND escala.estado = 'rascunho'
));

DROP POLICY IF EXISTS escalas_servico_linhas_delete_policy ON public.escalas_servico_linhas;
CREATE POLICY escalas_servico_linhas_delete_policy
ON public.escalas_servico_linhas FOR DELETE
USING (EXISTS (
    SELECT 1 FROM public.escalas_servico escala
    WHERE escala.id = escala_id
      AND escala.empresa_id = current_empresa_id()
      AND escala.estado = 'rascunho'
));

CREATE OR REPLACE FUNCTION public.substituir_escala_servico(
    p_semana_inicio date,
    p_semana_fim date,
    p_linhas jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_empresa_id uuid := current_empresa_id();
    v_usuario_id uuid := public.current_user_profile_id();
    v_escala_id uuid;
BEGIN
    IF v_empresa_id IS NULL OR v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Contexto OSFlow incompleto.';
    END IF;

    IF jsonb_array_length(p_linhas) <> 10 THEN
        RAISE EXCEPTION 'A escala deve conter exatamente 10 slots.';
    END IF;

    SELECT id INTO v_escala_id
    FROM public.escalas_servico
    WHERE empresa_id = v_empresa_id
      AND semana_inicio = p_semana_inicio
      AND tipo = 'servico'
      AND estado = 'rascunho'
    FOR UPDATE;

    IF v_escala_id IS NULL THEN
        INSERT INTO public.escalas_servico (
            empresa_id, semana_inicio, semana_fim, tipo, estado, created_by, updated_by
        ) VALUES (
            v_empresa_id, p_semana_inicio, p_semana_fim, 'servico', 'rascunho', v_usuario_id, v_usuario_id
        )
        RETURNING id INTO v_escala_id;
    ELSE
        UPDATE public.escalas_servico
        SET semana_fim = p_semana_fim,
            updated_by = v_usuario_id,
            updated_at = now()
        WHERE id = v_escala_id;

        DELETE FROM public.escalas_servico_linhas
        WHERE escala_id = v_escala_id;
    END IF;

    INSERT INTO public.escalas_servico_linhas (
        escala_id, data, hora_inicio, hora_fim, usuario_id, titulo, descricao, estado, created_at, updated_at
    )
    SELECT
        v_escala_id, linha.data, linha.hora_inicio, linha.hora_fim, linha.usuario_id,
        linha.titulo, linha.descricao, COALESCE(linha.estado, 'pending'), now(), now()
    FROM jsonb_to_recordset(p_linhas) AS linha(
        data date, hora_inicio time, hora_fim time, usuario_id uuid,
        titulo text, descricao text, estado text
    );

    RETURN v_escala_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.publicar_escala_servico(p_escala_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_empresa_id uuid := current_empresa_id();
    v_usuario_id uuid := public.current_user_profile_id();
    v_linhas integer;
    v_semana_inicio date;
BEGIN
    IF v_empresa_id IS NULL OR v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Contexto OSFlow incompleto.';
    END IF;

    SELECT semana_inicio INTO v_semana_inicio
    FROM public.escalas_servico
    WHERE id = p_escala_id
      AND empresa_id = v_empresa_id
      AND estado = 'rascunho'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Apenas uma escala em rascunho pode ser publicada.';
    END IF;

    SELECT count(*) INTO v_linhas
    FROM public.escalas_servico_linhas
    WHERE escala_id = p_escala_id;

    IF v_linhas <> 10 THEN
        RAISE EXCEPTION 'A escala deve conter exatamente 10 slots.';
    END IF;

    UPDATE public.escalas_servico
    SET estado = 'publicada',
        published_at = now(),
        published_by = v_usuario_id,
        updated_by = v_usuario_id,
        updated_at = now()
    WHERE id = p_escala_id;

    INSERT INTO public.audit_logs (
        event_type, status, user_id, empresa_id, modulo, entidade, entidade_id, metadata, created_at
    ) VALUES (
        'escala_servico.publicar', 'success', v_usuario_id, v_empresa_id,
        'servicos', 'escalas_servico', p_escala_id,
        jsonb_build_object('action', 'publicar_escala_servico', 'semana_inicio', v_semana_inicio), now()
    );

    RETURN p_escala_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.substituir_escala_servico(date, date, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publicar_escala_servico(uuid) TO authenticated;

COMMIT;
