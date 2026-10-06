-- DB-080 - Mantém a escala publicada editável sem re-publicar

BEGIN;

DROP POLICY IF EXISTS escalas_servico_update_policy ON public.escalas_servico;
CREATE POLICY escalas_servico_update_policy
ON public.escalas_servico FOR UPDATE
USING (
    empresa_id = current_empresa_id()
)
WITH CHECK (
    empresa_id = current_empresa_id()
    AND estado IN ('rascunho', 'publicada')
);

DROP POLICY IF EXISTS escalas_servico_linhas_insert_policy ON public.escalas_servico_linhas;
CREATE POLICY escalas_servico_linhas_insert_policy
ON public.escalas_servico_linhas FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.escalas_servico escala
    WHERE escala.id = escala_id
      AND escala.empresa_id = current_empresa_id()
));

DROP POLICY IF EXISTS escalas_servico_linhas_update_policy ON public.escalas_servico_linhas;
CREATE POLICY escalas_servico_linhas_update_policy
ON public.escalas_servico_linhas FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.escalas_servico escala
    WHERE escala.id = escala_id
      AND escala.empresa_id = current_empresa_id()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.escalas_servico escala
    WHERE escala.id = escala_id
      AND escala.empresa_id = current_empresa_id()
));

DROP POLICY IF EXISTS escalas_servico_linhas_delete_policy ON public.escalas_servico_linhas;
CREATE POLICY escalas_servico_linhas_delete_policy
ON public.escalas_servico_linhas FOR DELETE
USING (EXISTS (
    SELECT 1 FROM public.escalas_servico escala
    WHERE escala.id = escala_id
      AND escala.empresa_id = current_empresa_id()
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
    v_estado_anterior text;
BEGIN
    IF v_empresa_id IS NULL OR v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Contexto OSFlow incompleto.';
    END IF;

    IF jsonb_array_length(p_linhas) <> 10 THEN
        RAISE EXCEPTION 'A escala deve conter exatamente 10 slots.';
    END IF;

    SELECT id, estado
      INTO v_escala_id, v_estado_anterior
    FROM public.escalas_servico
    WHERE empresa_id = v_empresa_id
      AND semana_inicio = p_semana_inicio
      AND tipo = 'servico'
    ORDER BY created_at DESC
    LIMIT 1
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
        v_escala_id,
        linha.data,
        linha.hora_inicio,
        linha.hora_fim,
        linha.usuario_id,
        linha.titulo,
        linha.descricao,
        COALESCE(linha.estado, 'pending'),
        now(),
        now()
    FROM jsonb_to_recordset(p_linhas) AS linha(
        data date,
        hora_inicio time,
        hora_fim time,
        usuario_id uuid,
        titulo text,
        descricao text,
        estado text
    );

    IF v_estado_anterior = 'publicada' THEN
        INSERT INTO public.audit_logs (
            event_type,
            status,
            user_id,
            empresa_id,
            modulo,
            entidade,
            entidade_id,
            metadata,
            created_at
        ) VALUES (
            'escala_servico.update_publicada',
            'success',
            v_usuario_id,
            v_empresa_id,
            'servicos',
            'escalas_servico',
            v_escala_id,
            jsonb_build_object(
                'action', 'substituir_escala_servico',
                'semana_inicio', p_semana_inicio,
                'estado_anterior', v_estado_anterior,
                'estado_posterior', 'publicada',
                'slots_total', jsonb_array_length(p_linhas)
            ),
            now()
        );
    END IF;

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
    v_estado_atual text;
BEGIN
    IF v_empresa_id IS NULL OR v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Contexto OSFlow incompleto.';
    END IF;

    SELECT estado INTO v_estado_atual
    FROM public.escalas_servico
    WHERE id = p_escala_id
      AND empresa_id = v_empresa_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Escala de serviço não encontrada.';
    END IF;

    IF v_estado_atual = 'publicada' THEN
        RETURN p_escala_id;
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
        jsonb_build_object('action', 'publicar_escala_servico', 'estado_anterior', 'rascunho', 'estado_posterior', 'publicada'), now()
    );

    RETURN p_escala_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.substituir_escala_servico(date, date, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publicar_escala_servico(uuid) TO authenticated;

COMMIT;
