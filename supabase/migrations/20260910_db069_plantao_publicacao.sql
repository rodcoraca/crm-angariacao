-- DB-069 - Ciclo de vida e periodo da escala de plantao

BEGIN;

ALTER TABLE public.plantoes
    ALTER COLUMN servico_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS escala_id uuid NULL,
    ADD COLUMN IF NOT EXISTS periodo_inicio date NULL,
    ADD COLUMN IF NOT EXISTS periodo_fim date NULL,
    ADD COLUMN IF NOT EXISTS escala_estado text NOT NULL DEFAULT 'rascunho',
    ADD COLUMN IF NOT EXISTS published_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS published_by uuid NULL;

ALTER TABLE public.plantoes
    DROP CONSTRAINT IF EXISTS plantoes_empresa_servico_fk;

ALTER TABLE public.plantoes
    DROP CONSTRAINT IF EXISTS plantoes_escala_estado_check;

ALTER TABLE public.plantoes
    ADD CONSTRAINT plantoes_escala_estado_check
    CHECK (escala_estado IN ('rascunho', 'publicada'));

ALTER TABLE public.plantoes
    DROP CONSTRAINT IF EXISTS plantoes_published_by_fk;

ALTER TABLE public.plantoes
    ADD CONSTRAINT plantoes_published_by_fk
    FOREIGN KEY (published_by)
    REFERENCES public.usuarios(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_plantoes_empresa_periodo_escala
    ON public.plantoes (empresa_id, periodo_inicio, periodo_fim, escala_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_plantoes_unica_linha_escala
    ON public.plantoes (escala_id, data)
    WHERE escala_id IS NOT NULL;

DROP POLICY IF EXISTS plantoes_update_policy ON public.plantoes;
CREATE POLICY plantoes_update_policy
ON public.plantoes FOR UPDATE
USING (
    empresa_id = current_empresa_id()
    AND escala_estado = 'rascunho'
)
WITH CHECK (
    empresa_id = current_empresa_id()
    AND escala_estado IN ('rascunho', 'publicada')
);

DROP POLICY IF EXISTS plantoes_delete_policy ON public.plantoes;
CREATE POLICY plantoes_delete_policy
ON public.plantoes FOR DELETE
USING (
    empresa_id = current_empresa_id()
    AND escala_estado = 'rascunho'
);

CREATE OR REPLACE FUNCTION public.substituir_escala_plantao(
    p_periodo_inicio date,
    p_periodo_fim date,
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
    v_linhas integer;
BEGIN
    IF v_empresa_id IS NULL OR v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Contexto OSFlow incompleto.';
    END IF;

    v_linhas := jsonb_array_length(p_linhas);
    IF v_linhas < 4 THEN
        RAISE EXCEPTION 'O plantão deve conter pelo menos 4 sábados.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(p_linhas) AS linha(data date, usuario_id uuid, servico_id uuid, hora_inicio time, hora_fim time)
        WHERE extract(isodow from linha.data) <> 6
    ) THEN
        RAISE EXCEPTION 'Todas as linhas do plantão devem ser sábados.';
    END IF;

    IF (SELECT count(DISTINCT linha.data)
        FROM jsonb_to_recordset(p_linhas) AS linha(data date, usuario_id uuid, servico_id uuid, hora_inicio time, hora_fim time)) <> v_linhas THEN
        RAISE EXCEPTION 'As datas do plantão devem ser distintas.';
    END IF;

    SELECT escala_id INTO v_escala_id
    FROM public.plantoes
    WHERE empresa_id = v_empresa_id
      AND periodo_inicio = p_periodo_inicio
      AND periodo_fim = p_periodo_fim
      AND escala_estado = 'rascunho'
      AND escala_id IS NOT NULL
    LIMIT 1
    FOR UPDATE;

    IF v_escala_id IS NULL THEN
        v_escala_id := gen_random_uuid();
    ELSE
        DELETE FROM public.plantoes
        WHERE empresa_id = v_empresa_id
          AND escala_id = v_escala_id
          AND escala_estado = 'rascunho';
    END IF;

    INSERT INTO public.plantoes (
        empresa_id, servico_id, escala_id, periodo_inicio, periodo_fim,
        data, hora_inicio, hora_fim, usuario_id, estado, escala_estado,
        created_by, updated_by, created_at, updated_at
    )
    SELECT
        v_empresa_id, linha.servico_id, v_escala_id, p_periodo_inicio, p_periodo_fim,
        linha.data, COALESCE(linha.hora_inicio, '09:00'::time), COALESCE(linha.hora_fim, '18:00'::time),
        linha.usuario_id, 'scheduled', 'rascunho', v_usuario_id, v_usuario_id, now(), now()
    FROM jsonb_to_recordset(p_linhas) AS linha(
        data date, usuario_id uuid, servico_id uuid, hora_inicio time, hora_fim time
    );

    RETURN v_escala_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.publicar_escala_plantao(p_escala_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_empresa_id uuid := current_empresa_id();
    v_usuario_id uuid := public.current_user_profile_id();
    v_linhas integer;
    v_inicio date;
    v_fim date;
BEGIN
    IF v_empresa_id IS NULL OR v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Contexto OSFlow incompleto.';
    END IF;

    SELECT min(periodo_inicio), max(periodo_fim), count(*)
    INTO v_inicio, v_fim, v_linhas
    FROM public.plantoes
    WHERE empresa_id = v_empresa_id
      AND escala_id = p_escala_id
      AND escala_estado = 'rascunho';

    IF v_linhas < 4 THEN
        RAISE EXCEPTION 'Apenas um rascunho com pelo menos 4 sábados pode ser publicado.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.plantoes
        WHERE empresa_id = v_empresa_id
          AND escala_id = p_escala_id
          AND (extract(isodow from data) <> 6 OR usuario_id IS NULL)
    ) THEN
        RAISE EXCEPTION 'Cada sábado publicado deve ter um comercial atribuído.';
    END IF;

    UPDATE public.plantoes
    SET escala_estado = 'publicada',
        published_at = now(),
        published_by = v_usuario_id,
        updated_by = v_usuario_id,
        updated_at = now()
    WHERE empresa_id = v_empresa_id
      AND escala_id = p_escala_id
      AND escala_estado = 'rascunho';

    INSERT INTO public.audit_logs (
        event_type, status, user_id, empresa_id, modulo, entidade, entidade_id, metadata, created_at
    ) VALUES (
        'plantao.publicar', 'success', v_usuario_id, v_empresa_id,
        'plantoes', 'plantoes', p_escala_id,
        jsonb_build_object('action', 'publicar_escala_plantao', 'periodo_inicio', v_inicio, 'periodo_fim', v_fim), now()
    );

    RETURN p_escala_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.substituir_escala_plantao(date, date, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publicar_escala_plantao(uuid) TO authenticated;

COMMIT;
