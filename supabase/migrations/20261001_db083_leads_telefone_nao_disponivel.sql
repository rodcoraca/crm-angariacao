BEGIN;

ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS telefone_nao_disponivel boolean NOT NULL DEFAULT false;

ALTER TABLE public.leads
    ADD CONSTRAINT leads_telefone_check
    CHECK (
        telefone IS NULL
        OR telefone_nao_disponivel = false
    )
    NOT VALID;

COMMIT;
