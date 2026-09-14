-- ============================================================
-- DB-065
-- Fase 1 - Base de Dados: servicos + servico_participantes + plantoes + compromissos
-- ============================================================

BEGIN;

---------------------------------------------------------------
-- servicos
---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.servicos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    nome text NOT NULL,
    descricao text NULL,
    ativo boolean NOT NULL DEFAULT true,

    CONSTRAINT servicos_empresa_id_unique
        UNIQUE (empresa_id, id),
    hora_inicio time NOT NULL,
    hora_fim time NOT NULL,
    dias_semana smallint[] NOT NULL DEFAULT '{1,2,3,4,5}',
    created_by uuid NULL,
    updated_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT servicos_empresa_fk
        FOREIGN KEY (empresa_id)
        REFERENCES public.empresas(id)
        ON DELETE CASCADE,

    CONSTRAINT servicos_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT servicos_updated_by_fk
        FOREIGN KEY (updated_by)
        REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT servicos_horario_check
        CHECK (hora_fim > hora_inicio),

    CONSTRAINT servicos_dias_semana_check
        CHECK (
            dias_semana IS NOT NULL
            AND array_length(dias_semana, 1) > 0
        )
);

CREATE INDEX IF NOT EXISTS idx_servicos_empresa_id
    ON public.servicos (empresa_id);

CREATE INDEX IF NOT EXISTS idx_servicos_empresa_ativo
    ON public.servicos (empresa_id, ativo);

ALTER TABLE public.servicos
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.servicos
    FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS servicos_select_policy
ON public.servicos;

DROP POLICY IF EXISTS servicos_insert_policy
ON public.servicos;

DROP POLICY IF EXISTS servicos_update_policy
ON public.servicos;

DROP POLICY IF EXISTS servicos_delete_policy
ON public.servicos;

CREATE POLICY servicos_select_policy
ON public.servicos
FOR SELECT
USING (
    empresa_id = current_empresa_id()
);

CREATE POLICY servicos_insert_policy
ON public.servicos
FOR INSERT
WITH CHECK (
    empresa_id = current_empresa_id()
);

CREATE POLICY servicos_update_policy
ON public.servicos
FOR UPDATE
USING (
    empresa_id = current_empresa_id()
)
WITH CHECK (
    empresa_id = current_empresa_id()
);

CREATE POLICY servicos_delete_policy
ON public.servicos
FOR DELETE
USING (
    empresa_id = current_empresa_id()
    AND is_admin()
);

---------------------------------------------------------------
-- servico_participantes
---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.servico_participantes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    servico_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    ativo boolean NOT NULL DEFAULT true,
    created_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT servico_participantes_empresa_fk
        FOREIGN KEY (empresa_id)
        REFERENCES public.empresas(id)
        ON DELETE CASCADE,

    CONSTRAINT servico_participantes_empresa_servico_fk
        FOREIGN KEY (empresa_id, servico_id)
        REFERENCES public.servicos(empresa_id, id)
        ON DELETE CASCADE,

    CONSTRAINT servico_participantes_usuario_fk
        FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios(id)
        ON DELETE CASCADE,

    CONSTRAINT servico_participantes_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT servico_participantes_unico_servico_usuario
        UNIQUE (servico_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_servico_participantes_empresa_id
    ON public.servico_participantes (empresa_id);

CREATE INDEX IF NOT EXISTS idx_servico_participantes_servico_id
    ON public.servico_participantes (servico_id);

CREATE INDEX IF NOT EXISTS idx_servico_participantes_usuario_id
    ON public.servico_participantes (usuario_id);

ALTER TABLE public.servico_participantes
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.servico_participantes
    FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS servico_participantes_select_policy
ON public.servico_participantes;

DROP POLICY IF EXISTS servico_participantes_insert_policy
ON public.servico_participantes;

DROP POLICY IF EXISTS servico_participantes_update_policy
ON public.servico_participantes;

DROP POLICY IF EXISTS servico_participantes_delete_policy
ON public.servico_participantes;

CREATE POLICY servico_participantes_select_policy
ON public.servico_participantes
FOR SELECT
USING (
    empresa_id = current_empresa_id()
);

CREATE POLICY servico_participantes_insert_policy
ON public.servico_participantes
FOR INSERT
WITH CHECK (
    empresa_id = current_empresa_id()
);

CREATE POLICY servico_participantes_update_policy
ON public.servico_participantes
FOR UPDATE
USING (
    empresa_id = current_empresa_id()
)
WITH CHECK (
    empresa_id = current_empresa_id()
);

CREATE POLICY servico_participantes_delete_policy
ON public.servico_participantes
FOR DELETE
USING (
    empresa_id = current_empresa_id()
    AND is_admin()
);

---------------------------------------------------------------
-- plantoes
---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.plantoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    servico_id uuid NOT NULL,
    data date NOT NULL,
    hora_inicio time NOT NULL,
    hora_fim time NOT NULL,
    usuario_id uuid NULL,
    estado text NOT NULL DEFAULT 'scheduled',
    compromisso_id uuid NULL,
    created_by uuid NULL,
    updated_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT plantoes_empresa_fk
        FOREIGN KEY (empresa_id)
        REFERENCES public.empresas(id)
        ON DELETE CASCADE,

    CONSTRAINT plantoes_empresa_servico_fk
        FOREIGN KEY (empresa_id, servico_id)
        REFERENCES public.servicos(empresa_id, id)
        ON DELETE CASCADE,

    CONSTRAINT plantoes_usuario_fk
        FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT plantoes_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT plantoes_updated_by_fk
        FOREIGN KEY (updated_by)
        REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT plantoes_estado_check
        CHECK (estado IN ('scheduled', 'confirmed', 'completed', 'cancelled')),

    CONSTRAINT plantoes_horario_check
        CHECK (hora_fim > hora_inicio)
);

CREATE INDEX IF NOT EXISTS idx_plantoes_empresa_id
    ON public.plantoes (empresa_id);

CREATE INDEX IF NOT EXISTS idx_plantoes_empresa_data
    ON public.plantoes (empresa_id, data);

CREATE INDEX IF NOT EXISTS idx_plantoes_servico_id
    ON public.plantoes (servico_id);

CREATE INDEX IF NOT EXISTS idx_plantoes_usuario_data
    ON public.plantoes (usuario_id, data);

ALTER TABLE public.plantoes
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.plantoes
    FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plantoes_select_policy
ON public.plantoes;

DROP POLICY IF EXISTS plantoes_insert_policy
ON public.plantoes;

DROP POLICY IF EXISTS plantoes_update_policy
ON public.plantoes;

DROP POLICY IF EXISTS plantoes_delete_policy
ON public.plantoes;

CREATE POLICY plantoes_select_policy
ON public.plantoes
FOR SELECT
USING (
    empresa_id = current_empresa_id()
);

CREATE POLICY plantoes_insert_policy
ON public.plantoes
FOR INSERT
WITH CHECK (
    empresa_id = current_empresa_id()
);

CREATE POLICY plantoes_update_policy
ON public.plantoes
FOR UPDATE
USING (
    empresa_id = current_empresa_id()
)
WITH CHECK (
    empresa_id = current_empresa_id()
);

CREATE POLICY plantoes_delete_policy
ON public.plantoes
FOR DELETE
USING (
    empresa_id = current_empresa_id()
    AND is_admin()
);

---------------------------------------------------------------
-- compromissos
---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.compromissos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    titulo text NOT NULL,
    descricao text NULL,
    data date NOT NULL,
    hora_inicio time NOT NULL,
    hora_fim time NOT NULL,
    usuario_id uuid NULL,
    estado text NOT NULL DEFAULT 'pending',
    origem_tipo text NOT NULL DEFAULT 'plantao',
    origem_id uuid NULL,
    created_by uuid NULL,
    updated_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT compromissos_empresa_fk
        FOREIGN KEY (empresa_id)
        REFERENCES public.empresas(id)
        ON DELETE CASCADE,

    CONSTRAINT compromissos_usuario_fk
        FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT compromissos_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT compromissos_updated_by_fk
        FOREIGN KEY (updated_by)
        REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT compromissos_estado_check
        CHECK (estado IN ('pending', 'confirmed', 'completed', 'cancelled')),

    CONSTRAINT compromissos_origem_tipo_check
        CHECK (origem_tipo IN ('plantao')),

    CONSTRAINT compromissos_horario_check
        CHECK (hora_fim > hora_inicio)
);

CREATE INDEX IF NOT EXISTS idx_compromissos_empresa_id
    ON public.compromissos (empresa_id);

CREATE INDEX IF NOT EXISTS idx_compromissos_empresa_data
    ON public.compromissos (empresa_id, data);

CREATE INDEX IF NOT EXISTS idx_compromissos_usuario_data
    ON public.compromissos (usuario_id, data);

CREATE INDEX IF NOT EXISTS idx_compromissos_origem_tipo_origem_id
    ON public.compromissos (origem_tipo, origem_id);

ALTER TABLE public.compromissos
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.compromissos
    FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS compromissos_select_policy
ON public.compromissos;

DROP POLICY IF EXISTS compromissos_insert_policy
ON public.compromissos;

DROP POLICY IF EXISTS compromissos_update_policy
ON public.compromissos;

DROP POLICY IF EXISTS compromissos_delete_policy
ON public.compromissos;

CREATE POLICY compromissos_select_policy
ON public.compromissos
FOR SELECT
USING (
    empresa_id = current_empresa_id()
);

CREATE POLICY compromissos_insert_policy
ON public.compromissos
FOR INSERT
WITH CHECK (
    empresa_id = current_empresa_id()
);

CREATE POLICY compromissos_update_policy
ON public.compromissos
FOR UPDATE
USING (
    empresa_id = current_empresa_id()
)
WITH CHECK (
    empresa_id = current_empresa_id()
);

CREATE POLICY compromissos_delete_policy
ON public.compromissos
FOR DELETE
USING (
    empresa_id = current_empresa_id()
    AND is_admin()
);

COMMIT;
