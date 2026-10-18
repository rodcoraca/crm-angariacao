-- DB-088: Canonicalização dos estados de empresas.
-- Objetivo: alinhar dados legados e o valor predefinido com o contrato do módulo Empresas.

BEGIN;

UPDATE public.empresas
SET estado = 'ativo'
WHERE estado = 'ativa';

UPDATE public.empresas
SET estado = 'inativo'
WHERE estado = 'inativa';

ALTER TABLE public.empresas
    ALTER COLUMN estado SET DEFAULT 'ativo';

COMMIT;
