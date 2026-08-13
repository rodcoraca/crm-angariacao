-- ============================================================
-- DB-053
-- Migração provider_leads → catálogo global (FASE 2 – Revisão 3)
-- Popula empresa_provider_listings a partir de provider_leads.
-- Deduplica provider_leads para unicidade global por
-- (provider, external_id).
-- Sem alteração a código React/JS/TS, Radar ou Sync.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_conflict_count INTEGER;
  v_conflict_msg   TEXT;
  v_lost_count     INTEGER;
BEGIN

  ---------------------------------------------------------------
  -- PASSO 2b — DETECÇÃO DE CONFLITOS DE crm_lead_id
  -- Primeira instrução executada. Antes de qualquer escrita.
  -- Se existir qualquer conflito: RAISE EXCEPTION → ROLLBACK.
  ---------------------------------------------------------------

  SELECT
    COUNT(*),
    string_agg(
      format(
        'empresa=%s provider=%s external_id=%s crm_lead_ids=[%s]',
        empresa_id::text,
        provider,
        external_id,
        array_to_string(crm_lead_ids, ', ')
      ),
      ' | '
    )
  INTO v_conflict_count, v_conflict_msg
  FROM (
    SELECT
      empresa_id,
      provider,
      external_id,
      array_agg(DISTINCT crm_lead_id ORDER BY crm_lead_id) AS crm_lead_ids
    FROM public.provider_leads
    WHERE crm_lead_id IS NOT NULL
    GROUP BY empresa_id, provider, external_id
    HAVING count(DISTINCT crm_lead_id) > 1
  ) sub;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION
      'DB-053 abortado — % conflito(s) de crm_lead_id. Resolver manualmente antes de re-executar. Detalhes: %',
      v_conflict_count,
      COALESCE(v_conflict_msg, '(sem detalhes)');
  END IF;

  ---------------------------------------------------------------
  -- PASSO 2a — CONSOLIDAR CAMPOS GLOBAIS NOS CANÔNICOS
  -- Canônico = MIN(created_at), desempate MIN(id).
  -- provider_active, last_seen_at, updated_at consolidados
  -- a partir de todos os duplicados do mesmo (provider, external_id).
  -- score, raw_data, title, price, url e campos descritivos
  -- mantêm os valores do canônico (sem fusão).
  ---------------------------------------------------------------

  WITH canonicals AS (
    SELECT DISTINCT ON (provider, external_id)
      id AS canonical_id,
      provider,
      external_id
    FROM public.provider_leads
    ORDER BY provider, external_id, created_at, id
  ),
  aggregated AS (
    SELECT
      c.canonical_id,
      BOOL_OR(pl.provider_active)  AS max_active,
      MAX(pl.last_seen_at)         AS max_last_seen,
      MAX(pl.updated_at)           AS max_updated
    FROM canonicals c
    JOIN public.provider_leads pl
      ON  pl.provider    = c.provider
      AND pl.external_id = c.external_id
    GROUP BY c.canonical_id
  )
  UPDATE public.provider_leads pl
  SET
    provider_active = aggregated.max_active,
    last_seen_at    = aggregated.max_last_seen,
    updated_at      = aggregated.max_updated
  FROM aggregated
  WHERE pl.id = aggregated.canonical_id;

  ---------------------------------------------------------------
  -- PASSO 2c — POPULAR empresa_provider_listings
  -- Todos os rows com empresa_id, apontando para o canônico.
  -- Preserva imported, imported_at, imported_by, crm_lead_id,
  -- first_seen_at de cada row original.
  -- ON CONFLICT: nunca sobrescreve crm_lead_id ou imported_by
  -- já existentes; imported usa OR lógico via GREATEST.
  ---------------------------------------------------------------

  WITH canonicals AS (
    SELECT DISTINCT ON (provider, external_id)
      id AS canonical_id,
      provider,
      external_id
    FROM public.provider_leads
    ORDER BY provider, external_id, created_at, id
  )
  INSERT INTO public.empresa_provider_listings (
    empresa_id,
    provider_lead_id,
    imported,
    imported_at,
    imported_by,
    crm_lead_id,
    first_seen_at,
    created_at,
    updated_at
  )
  SELECT
    pl.empresa_id,
    c.canonical_id,
    COALESCE(pl.imported, false),
    pl.imported_at,
    pl.imported_by,
    pl.crm_lead_id,
    pl.created_at,
    now(),
    now()
  FROM public.provider_leads pl
  JOIN canonicals c
    ON  c.provider    = pl.provider
    AND c.external_id = pl.external_id
  WHERE pl.empresa_id IS NOT NULL
  ON CONFLICT (empresa_id, provider_lead_id) DO UPDATE SET
    imported      = GREATEST(EXCLUDED.imported,      empresa_provider_listings.imported),
    imported_at   = COALESCE(empresa_provider_listings.imported_at,   EXCLUDED.imported_at),
    imported_by   = COALESCE(empresa_provider_listings.imported_by,   EXCLUDED.imported_by),
    crm_lead_id   = COALESCE(empresa_provider_listings.crm_lead_id,   EXCLUDED.crm_lead_id),
    first_seen_at = LEAST   (empresa_provider_listings.first_seen_at, EXCLUDED.first_seen_at),
    updated_at    = now();

  ---------------------------------------------------------------
  -- PASSO 2d — VALIDAR QUE NENHUM crm_lead_id FOI PERDIDO
  -- Executado após INSERT, antes de qualquer DELETE.
  -- Se qualquer crm_lead_id não tiver correspondência na junction:
  -- RAISE EXCEPTION → ROLLBACK. Nenhum DELETE é executado.
  ---------------------------------------------------------------

  SELECT COUNT(*)
  INTO v_lost_count
  FROM public.provider_leads pl
  WHERE pl.crm_lead_id IS NOT NULL
    AND pl.empresa_id  IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.empresa_provider_listings epl
      WHERE epl.empresa_id  = pl.empresa_id
        AND epl.crm_lead_id = pl.crm_lead_id
    );

  IF v_lost_count > 0 THEN
    RAISE EXCEPTION
      'DB-053 abortado — % crm_lead_id(s) não transferido(s) para empresa_provider_listings. Nenhum DELETE executado.',
      v_lost_count;
  END IF;

  ---------------------------------------------------------------
  -- PASSO 2e — ELIMINAR ROWS NÃO-CANÔNICOS
  -- Executado apenas após v_lost_count = 0.
  ---------------------------------------------------------------

  DELETE FROM public.provider_leads
  WHERE id NOT IN (
    SELECT DISTINCT ON (provider, external_id) id
    FROM public.provider_leads
    ORDER BY provider, external_id, created_at, id
  );

  ---------------------------------------------------------------
  -- PASSO 2f — SUBSTITUIR UNIQUE INDEX
  -- Remove constraint por empresa; cria constraint global.
  -- empresa_id permanece na tabela (nullable) durante transição.
  ---------------------------------------------------------------

  DROP INDEX IF EXISTS uq_provider_leads_empresa_provider_external_id;

  CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_leads_provider_external_id
    ON public.provider_leads (provider, external_id);

END;
$$;

COMMIT;
