-- ============================================================
-- DB-055
-- Base estrutural para Cliente / Empreendimento / Unidades
-- ============================================================

BEGIN;

---------------------------------------------------------------
-- Extensao do modelo de ficheiros para suportar
-- empreendimento/documentos e unidade/planta sem duplicar sistema
---------------------------------------------------------------

ALTER TABLE public.imovel_ficheiros
    ADD COLUMN IF NOT EXISTS entidade_tipo text NULL,
    ADD COLUMN IF NOT EXISTS entidade_id uuid NULL,
    ADD COLUMN IF NOT EXISTS tipo_documento text NULL;

ALTER TABLE public.imovel_ficheiros
    DROP CONSTRAINT IF EXISTS imovel_ficheiros_entidade_tipo_check;

ALTER TABLE public.imovel_ficheiros
    ADD CONSTRAINT imovel_ficheiros_entidade_tipo_check
    CHECK (
        entidade_tipo IS NULL
        OR entidade_tipo IN ('imovel', 'empreendimento', 'unidade')
    );

CREATE INDEX IF NOT EXISTS idx_imovel_ficheiros_entidade
    ON public.imovel_ficheiros (entidade_tipo, entidade_id);

---------------------------------------------------------------
-- Tabela: clientes
---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.clientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    created_by uuid NULL,
    updated_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    responsavel_angariacao uuid NULL,
    telefone_responsavel text NULL,
    email_responsavel text NULL,
    tipo_cliente text NULL,
    nome_designacao text NOT NULL,
    nipc text NULL,
    ami text NULL,
    telefone_fixo text NULL,
    telefone_movel text NULL,
    email text NULL,
    morada text NULL,
    numero_policia text NULL,
    complemento text NULL,
    contacto_1 text NULL,
    telemovel_contacto_1 text NULL,
    email_contacto_1 text NULL,
    contacto_2 text NULL,
    telemovel_contacto_2 text NULL,
    email_contacto_2 text NULL,

    CONSTRAINT clientes_empresa_fk
        FOREIGN KEY (empresa_id) REFERENCES public.empresas(id)
        ON DELETE CASCADE,

    CONSTRAINT clientes_created_by_fk
        FOREIGN KEY (created_by) REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT clientes_updated_by_fk
        FOREIGN KEY (updated_by) REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT clientes_tipo_cliente_check
        CHECK (
            tipo_cliente IS NULL
            OR tipo_cliente IN ('Construtor','Promotor','Imobiliaria')
        )
);

CREATE INDEX IF NOT EXISTS idx_clientes_empresa_id
    ON public.clientes (empresa_id);

CREATE INDEX IF NOT EXISTS idx_clientes_created_by
    ON public.clientes (created_by);

---------------------------------------------------------------
-- Tabela: empreendimentos
---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.empreendimentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    cliente_id uuid NOT NULL,
    created_by uuid NULL,
    updated_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    nome text NOT NULL,
    morada text NULL,
    distrito text NULL,
    concelho text NULL,
    freguesia text NULL,
    percentual_comissao numeric(5,2) NULL,
    iva_incluido boolean NULL,
    inicio_obras date NULL,
    previsao_entrega date NULL,

    CONSTRAINT empreendimentos_empresa_fk
        FOREIGN KEY (empresa_id) REFERENCES public.empresas(id)
        ON DELETE CASCADE,

    CONSTRAINT empreendimentos_cliente_fk
        FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
        ON DELETE CASCADE,

    CONSTRAINT empreendimentos_created_by_fk
        FOREIGN KEY (created_by) REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT empreendimentos_updated_by_fk
        FOREIGN KEY (updated_by) REFERENCES public.usuarios(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_empreendimentos_empresa_id
    ON public.empreendimentos (empresa_id);

CREATE INDEX IF NOT EXISTS idx_empreendimentos_cliente_id
    ON public.empreendimentos (cliente_id);

---------------------------------------------------------------
-- Tabela: empreendimento_condicoes_pagamento
---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.empreendimento_condicoes_pagamento (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empreendimento_id uuid NOT NULL,
    nome_etapa text NOT NULL,
    ordem integer NOT NULL,
    tipo_valor text NOT NULL,
    valor numeric(18,2) NULL,
    negociavel boolean NOT NULL DEFAULT false,
    condicao_negociacao text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT empreendimentos_condicoes_empreendimento_fk
        FOREIGN KEY (empreendimento_id) REFERENCES public.empreendimentos(id)
        ON DELETE CASCADE,

    CONSTRAINT empreendimentos_condicoes_tipo_valor_check
        CHECK (
            tipo_valor IN ('fixo','percentual','valor')
        )
);

CREATE INDEX IF NOT EXISTS idx_empreendimento_condicoes_empreendimento_id
    ON public.empreendimento_condicoes_pagamento (empreendimento_id);

CREATE INDEX IF NOT EXISTS idx_empreendimento_condicoes_ordem
    ON public.empreendimento_condicoes_pagamento (empreendimento_id, ordem);

---------------------------------------------------------------
-- Tabela: unidades
---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.unidades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    empreendimento_id uuid NOT NULL,
    created_by uuid NULL,
    updated_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    fracao text NULL,
    tipologia text NULL,
    area_bruta_privativa numeric(10,2) NULL,
    area_total numeric(10,2) NULL,
    area_dependente numeric(10,2) NULL,
    varanda boolean NOT NULL DEFAULT false,
    terraco boolean NOT NULL DEFAULT false,
    lugares_garagem integer NULL,

    CONSTRAINT unidades_empresa_fk
        FOREIGN KEY (empresa_id) REFERENCES public.empresas(id)
        ON DELETE CASCADE,

    CONSTRAINT unidades_empreendimento_fk
        FOREIGN KEY (empreendimento_id) REFERENCES public.empreendimentos(id)
        ON DELETE CASCADE,

    CONSTRAINT unidades_created_by_fk
        FOREIGN KEY (created_by) REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT unidades_updated_by_fk
        FOREIGN KEY (updated_by) REFERENCES public.usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT unidades_lugares_garagem_check
        CHECK (
            lugares_garagem IS NULL
            OR (lugares_garagem >= 0 AND lugares_garagem <= 12)
        )
);

CREATE INDEX IF NOT EXISTS idx_unidades_empresa_id
    ON public.unidades (empresa_id);

CREATE INDEX IF NOT EXISTS idx_unidades_empreendimento_id
    ON public.unidades (empreendimento_id);

---------------------------------------------------------------
-- RLS: clientes
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

---------------------------------------------------------------
-- RLS: empreendimentos
---------------------------------------------------------------

ALTER TABLE public.empreendimentos
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.empreendimentos
    FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS empreendimentos_select_policy ON public.empreendimentos;
DROP POLICY IF EXISTS empreendimentos_insert_policy ON public.empreendimentos;
DROP POLICY IF EXISTS empreendimentos_update_policy ON public.empreendimentos;
DROP POLICY IF EXISTS empreendimentos_delete_policy ON public.empreendimentos;

CREATE POLICY empreendimentos_select_policy
ON public.empreendimentos
FOR SELECT
USING (
    empresa_id = current_empresa_id()
);

CREATE POLICY empreendimentos_insert_policy
ON public.empreendimentos
FOR INSERT
WITH CHECK (
    empresa_id = current_empresa_id()
);

CREATE POLICY empreendimentos_update_policy
ON public.empreendimentos
FOR UPDATE
USING (
    empresa_id = current_empresa_id()
)
WITH CHECK (
    empresa_id = current_empresa_id()
);

CREATE POLICY empreendimentos_delete_policy
ON public.empreendimentos
FOR DELETE
USING (
    empresa_id = current_empresa_id()
    AND is_admin()
);

---------------------------------------------------------------
-- RLS: unidades
---------------------------------------------------------------

ALTER TABLE public.unidades
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.unidades
    FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS unidades_select_policy ON public.unidades;
DROP POLICY IF EXISTS unidades_insert_policy ON public.unidades;
DROP POLICY IF EXISTS unidades_update_policy ON public.unidades;
DROP POLICY IF EXISTS unidades_delete_policy ON public.unidades;

CREATE POLICY unidades_select_policy
ON public.unidades
FOR SELECT
USING (
    empresa_id = current_empresa_id()
);

CREATE POLICY unidades_insert_policy
ON public.unidades
FOR INSERT
WITH CHECK (
    empresa_id = current_empresa_id()
);

CREATE POLICY unidades_update_policy
ON public.unidades
FOR UPDATE
USING (
    empresa_id = current_empresa_id()
)
WITH CHECK (
    empresa_id = current_empresa_id()
);

CREATE POLICY unidades_delete_policy
ON public.unidades
FOR DELETE
USING (
    empresa_id = current_empresa_id()
    AND is_admin()
);

---------------------------------------------------------------
-- RLS: condicoes_pagamento via relacionamento
---------------------------------------------------------------

ALTER TABLE public.empreendimento_condicoes_pagamento
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.empreendimento_condicoes_pagamento
    FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS empreendimento_condicoes_pagamento_select_policy ON public.empreendimento_condicoes_pagamento;
DROP POLICY IF EXISTS empreendimento_condicoes_pagamento_insert_policy ON public.empreendimento_condicoes_pagamento;
DROP POLICY IF EXISTS empreendimento_condicoes_pagamento_update_policy ON public.empreendimento_condicoes_pagamento;
DROP POLICY IF EXISTS empreendimento_condicoes_pagamento_delete_policy ON public.empreendimento_condicoes_pagamento;

CREATE POLICY empreendimento_condicoes_pagamento_select_policy
ON public.empreendimento_condicoes_pagamento
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.empreendimentos e
        WHERE e.id = empreendimento_condicoes_pagamento.empreendimento_id
          AND e.empresa_id = current_empresa_id()
    )
);

CREATE POLICY empreendimento_condicoes_pagamento_insert_policy
ON public.empreendimento_condicoes_pagamento
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.empreendimentos e
        WHERE e.id = empreendimento_condicoes_pagamento.empreendimento_id
          AND e.empresa_id = current_empresa_id()
    )
);

CREATE POLICY empreendimento_condicoes_pagamento_update_policy
ON public.empreendimento_condicoes_pagamento
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.empreendimentos e
        WHERE e.id = empreendimento_condicoes_pagamento.empreendimento_id
          AND e.empresa_id = current_empresa_id()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.empreendimentos e
        WHERE e.id = empreendimento_condicoes_pagamento.empreendimento_id
          AND e.empresa_id = current_empresa_id()
    )
);

CREATE POLICY empreendimento_condicoes_pagamento_delete_policy
ON public.empreendimento_condicoes_pagamento
FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM public.empreendimentos e
        WHERE e.id = empreendimento_condicoes_pagamento.empreendimento_id
          AND e.empresa_id = current_empresa_id()
    )
    AND is_admin()
);

COMMIT;
