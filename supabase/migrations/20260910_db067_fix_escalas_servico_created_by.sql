-- DB-067 - Usa usuarios.id como auditoria da escala de servico

BEGIN;

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
    IF v_empresa_id IS NULL THEN
        RAISE EXCEPTION 'Empresa nao identificada.';
    END IF;

    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Utilizador OSFlow nao identificado.';
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
        v_usuario_id,
        v_usuario_id
    )
    ON CONFLICT (empresa_id, semana_inicio, tipo)
    DO UPDATE SET
        semana_fim = EXCLUDED.semana_fim,
        updated_by = v_usuario_id,
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
