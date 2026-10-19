ALTER TABLE public.unidades
    ADD COLUMN IF NOT EXISTS casas_banho integer NULL;

ALTER TABLE public.unidades
    ADD CONSTRAINT unidades_casas_banho_check
    CHECK (
        casas_banho IS NULL
        OR casas_banho >= 0
    );
