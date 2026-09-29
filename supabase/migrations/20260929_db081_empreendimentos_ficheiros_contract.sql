-- ============================================================
-- DB-081
-- Contrato de ficheiros para Empreendimentos / Unidades
-- ============================================================
--
-- imovel_ficheiros suporta dois modelos:
--   1. Imóvel legado:
--        imovel_id preenchido
--   2. Entidades do domínio Empreendimentos:
--        entidade_tipo + entidade_id preenchidos
--
-- Para Unidade/Planta e Empreendimento/Documentos, imovel_id
-- NÃO representa a relação correta e deve permanecer NULL.
--
-- A migration DB-055 já introduziu entidade_tipo/entidade_id,
-- mas imovel_id permaneceu NOT NULL, impedindo os INSERTs do
-- novo domínio.

BEGIN;

---------------------------------------------------------------
-- 1. imovel_id deixa de ser obrigatório
---------------------------------------------------------------

ALTER TABLE public.imovel_ficheiros
    ALTER COLUMN imovel_id DROP NOT NULL;

---------------------------------------------------------------
-- 2. Fechar o contrato das referências de entidade
---------------------------------------------------------------

ALTER TABLE public.imovel_ficheiros
    DROP CONSTRAINT IF EXISTS imovel_ficheiros_entidade_ref_check;

ALTER TABLE public.imovel_ficheiros
    ADD CONSTRAINT imovel_ficheiros_entidade_ref_check
    CHECK (
        (
            entidade_tipo IS NULL
            AND entidade_id IS NULL
        )
        OR
        (
            entidade_tipo IS NOT NULL
            AND entidade_id IS NOT NULL
        )
    );

---------------------------------------------------------------
-- 3. Garantir que cada registo pertence a um dos modelos
---------------------------------------------------------------

ALTER TABLE public.imovel_ficheiros
    DROP CONSTRAINT IF EXISTS imovel_ficheiros_owner_ref_check;

ALTER TABLE public.imovel_ficheiros
    ADD CONSTRAINT imovel_ficheiros_owner_ref_check
    CHECK (
        imovel_id IS NOT NULL
        OR
        (
            entidade_tipo IS NOT NULL
            AND entidade_id IS NOT NULL
        )
    );

---------------------------------------------------------------
-- 4. Índice explícito para o domínio Empreendimentos
---------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_imovel_ficheiros_entidade_tipo_id
    ON public.imovel_ficheiros (entidade_tipo, entidade_id);

COMMENT ON COLUMN public.imovel_ficheiros.imovel_id IS
    'Referência legada ao domínio Imóveis. NULL para ficheiros de Empreendimento/Unidade.';

COMMENT ON COLUMN public.imovel_ficheiros.entidade_tipo IS
    'Tipo da entidade proprietária do ficheiro: imovel, empreendimento ou unidade.';

COMMENT ON COLUMN public.imovel_ficheiros.entidade_id IS
    'ID da entidade proprietária quando o ficheiro pertence ao domínio Empreendimentos.';

COMMIT;
