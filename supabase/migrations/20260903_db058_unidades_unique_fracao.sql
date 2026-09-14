BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unidades_empreendimento_fracao_unique
    ON public.unidades (empreendimento_id, LOWER(fracao));

COMMIT;
