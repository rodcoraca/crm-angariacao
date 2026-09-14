-- DB-066 - Identidade propria para escalas semanais de servico

BEGIN;

ALTER TABLE public.compromissos
    DROP CONSTRAINT IF EXISTS compromissos_origem_tipo_check;

ALTER TABLE public.compromissos
    ADD CONSTRAINT compromissos_origem_tipo_check
    CHECK (origem_tipo IN ('plantao'));

CREATE TABLE IF NOT EXISTS public.escalas_servico (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    semana_inicio date NOT NULL,
    semana_fim date NOT NULL,
    tipo text NOT NULL DEFAULT 'servico',
    created_by uuid NULL,
    updated_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT escalas_servico_empresa_fk
        FOREIGN KEY (empresa_id)
        REFERENCES public.empresas(id)
        ON DELETE CASCADE,

    CONSTRAINT escalas_servico_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT escalas_servico_updated_by_fk
        FOREIGN KEY (updated_by)
        REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT escalas_servico_tipo_check
        CHECK (tipo = 'servico'),

    CONSTRAINT escalas_servico_periodo_check
        CHECK (semana_fim >= semana_inicio),

    CONSTRAINT escalas_servico_empresa_semana_tipo_unique
        UNIQUE (empresa_id, semana_inicio, tipo)
);

CREATE TABLE IF NOT EXISTS public.escalas_servico_linhas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    escala_id uuid NOT NULL,
    data date NOT NULL,
    hora_inicio time NOT NULL,
    hora_fim time NOT NULL,
    usuario_id uuid NULL,
    titulo text NULL,
    descricao text NULL,
    estado text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT escalas_servico_linhas_escala_fk
        FOREIGN KEY (escala_id)
        REFERENCES public.escalas_servico(id)
        ON DELETE CASCADE,

    CONSTRAINT escalas_servico_linhas_usuario_fk
        FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT escalas_servico_linhas_horario_check
        CHECK (hora_fim > hora_inicio),

    CONSTRAINT escalas_servico_linhas_estado_check
        CHECK (estado IN ('pending', 'confirmed', 'completed', 'cancelled')),

    CONSTRAINT escalas_servico_linhas_escala_data_hora_unique
        UNIQUE (escala_id, data, hora_inicio, hora_fim)
);

CREATE INDEX IF NOT EXISTS idx_escalas_servico_empresa_semana
    ON public.escalas_servico (empresa_id, semana_inicio, semana_fim);

CREATE INDEX IF NOT EXISTS idx_escalas_servico_linhas_escala
    ON public.escalas_servico_linhas (escala_id, data, hora_inicio);

ALTER TABLE public.escalas_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas_servico FORCE ROW LEVEL SECURITY;
ALTER TABLE public.escalas_servico_linhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas_servico_linhas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS escalas_servico_select_policy ON public.escalas_servico;
DROP POLICY IF EXISTS escalas_servico_insert_policy ON public.escalas_servico;
DROP POLICY IF EXISTS escalas_servico_update_policy ON public.escalas_servico;
DROP POLICY IF EXISTS escalas_servico_delete_policy ON public.escalas_servico;

CREATE POLICY escalas_servico_select_policy
ON public.escalas_servico FOR SELECT
USING (empresa_id = current_empresa_id());

CREATE POLICY escalas_servico_insert_policy
ON public.escalas_servico FOR INSERT
WITH CHECK (empresa_id = current_empresa_id());

CREATE POLICY escalas_servico_update_policy
ON public.escalas_servico FOR UPDATE
USING (empresa_id = current_empresa_id())
WITH CHECK (empresa_id = current_empresa_id());

CREATE POLICY escalas_servico_delete_policy
ON public.escalas_servico FOR DELETE
USING (empresa_id = current_empresa_id() AND is_admin());

DROP POLICY IF EXISTS escalas_servico_linhas_select_policy ON public.escalas_servico_linhas;
DROP POLICY IF EXISTS escalas_servico_linhas_insert_policy ON public.escalas_servico_linhas;
DROP POLICY IF EXISTS escalas_servico_linhas_update_policy ON public.escalas_servico_linhas;
DROP POLICY IF EXISTS escalas_servico_linhas_delete_policy ON public.escalas_servico_linhas;

CREATE POLICY escalas_servico_linhas_select_policy
ON public.escalas_servico_linhas FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.escalas_servico escala
    WHERE escala.id = escala_id
      AND escala.empresa_id = current_empresa_id()
));

CREATE POLICY escalas_servico_linhas_insert_policy
ON public.escalas_servico_linhas FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.escalas_servico escala
    WHERE escala.id = escala_id
      AND escala.empresa_id = current_empresa_id()
));

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
    v_escala_id uuid;
BEGIN
    IF v_empresa_id IS NULL THEN
        RAISE EXCEPTION 'Empresa nao identificada.';
    END IF;

    INSERT INTO public.escalas_servico (
        empresa_id,
        semana_inicio,
        semana_fim,
        tipo,
        created_by,
        updated_by
    )
    VALUES (
        v_empresa_id,
        p_semana_inicio,
        p_semana_fim,
        'servico',
        public.current_user_profile_id(),
        public.current_user_profile_id()
    )
    ON CONFLICT (empresa_id, semana_inicio, tipo)
    DO UPDATE SET
        semana_fim = EXCLUDED.semana_fim,
        updated_by = public.current_user_profile_id(),
        updated_at = now()
    RETURNING id INTO v_escala_id;

    DELETE FROM public.escalas_servico_linhas
    WHERE escala_id = v_escala_id;

    INSERT INTO public.escalas_servico_linhas (
        escala_id,
        data,
        hora_inicio,
        hora_fim,
        usuario_id,
        titulo,
        descricao,
        estado,
        created_at,
        updated_at
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

    RETURN v_escala_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.substituir_escala_servico(date, date, jsonb) TO authenticated;

COMMIT;
