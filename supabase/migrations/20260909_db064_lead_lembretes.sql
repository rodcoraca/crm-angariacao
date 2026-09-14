-- ============================================================
-- DB-064
-- Entidade própria de lembretes por lead
-- ============================================================

BEGIN;

---------------------------------------------------------------
-- Tabela: lead_lembretes
---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lead_lembretes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid NOT NULL,
    empresa_id uuid NOT NULL,
    criado_por uuid NULL,
    data_lembrete date NOT NULL,
    hora_lembrete time NULL,
    estado text NOT NULL DEFAULT 'ativo',
    criado_at timestamptz NOT NULL DEFAULT now(),
    concluido_at timestamptz NULL,
    concluido_por uuid NULL,

    CONSTRAINT lead_lembretes_lead_fk
        FOREIGN KEY (lead_id)
        REFERENCES public.leads(id)
        ON DELETE CASCADE,

    CONSTRAINT lead_lembretes_empresa_fk
        FOREIGN KEY (empresa_id)
        REFERENCES public.empresas(id)
        ON DELETE CASCADE,

    CONSTRAINT lead_lembretes_criado_por_fk
        FOREIGN KEY (criado_por)
        REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT lead_lembretes_concluido_por_fk
        FOREIGN KEY (concluido_por)
        REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT lead_lembretes_estado_check
        CHECK (estado IN ('ativo', 'concluido'))
);

---------------------------------------------------------------
-- Índices mínimos
---------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_lead_lembretes_empresa_id
    ON public.lead_lembretes (empresa_id);

CREATE INDEX IF NOT EXISTS idx_lead_lembretes_lead_id
    ON public.lead_lembretes (lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_lembretes_estado
    ON public.lead_lembretes (estado);

CREATE INDEX IF NOT EXISTS idx_lead_lembretes_data_lembrete
    ON public.lead_lembretes (data_lembrete);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_lembretes_unico_ativo
    ON public.lead_lembretes (lead_id)
    WHERE estado = 'ativo';

---------------------------------------------------------------
-- RLS: seguir o padrão de leads
---------------------------------------------------------------

ALTER TABLE public.lead_lembretes
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lead_lembretes
    FORCE ROW LEVEL SECURITY;

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
    empresa_id = current_empresa_id()
);

CREATE POLICY lead_lembretes_insert_policy
ON public.lead_lembretes
FOR INSERT
WITH CHECK (
    empresa_id = current_empresa_id()
);

CREATE POLICY lead_lembretes_update_policy
ON public.lead_lembretes
FOR UPDATE
USING (
    empresa_id = current_empresa_id()
)
WITH CHECK (
    empresa_id = current_empresa_id()
);

CREATE POLICY lead_lembretes_delete_policy
ON public.lead_lembretes
FOR DELETE
USING (
    empresa_id = current_empresa_id()
    AND is_admin()
);

---------------------------------------------------------------
-- Migração dos dados existentes
---------------------------------------------------------------

INSERT INTO public.lead_lembretes (
    lead_id,
    empresa_id,
    criado_por,
    data_lembrete,
    hora_lembrete,
    estado,
    criado_at,
    concluido_at,
    concluido_por
)
SELECT
    l.id,
    l.empresa_id,
    l.agente_id,
    l.data_lembrete,
    l.hora_lembrete,
    'ativo',
    COALESCE(l.created_at, now()),
    NULL,
    NULL
FROM public.leads l
WHERE l.lembrete_ativo = true
  AND l.data_lembrete IS NOT NULL
  AND l.empresa_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.lead_lembretes ll
      WHERE ll.lead_id = l.id
        AND ll.estado = 'ativo'
  );

COMMIT;
