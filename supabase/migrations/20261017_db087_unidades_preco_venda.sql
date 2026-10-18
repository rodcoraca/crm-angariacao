-- DB-087: preço de venda individual por unidade/fração.

BEGIN;

ALTER TABLE public.unidades
    ADD COLUMN IF NOT EXISTS preco_venda numeric(18,2) NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unidades_preco_venda_check'
          AND conrelid = 'public.unidades'::regclass
    ) THEN
        ALTER TABLE public.unidades
            ADD CONSTRAINT unidades_preco_venda_check
            CHECK (preco_venda IS NULL OR preco_venda >= 0);
    END IF;
END $$;

COMMIT;
