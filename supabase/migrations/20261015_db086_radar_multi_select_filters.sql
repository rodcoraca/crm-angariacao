-- DB-086: filtros do Radar com seleção múltipla.
-- Novas chaves em p_filters (arrays; vazio/ausente = sem restrição; valores dentro do mesmo
-- critério são alternativas, critérios diferentes combinam-se com AND):
--   districts[], providers[], estados[] (novo | importado | nao_novo_nao_importado),
--   private_owner_values[] ('true' | 'false'; ambos = sem restrição), tipologias[],
--   date_ranges[] ({ "after": timestamptz, "before": timestamptz }).
-- As chaves escalares anteriores (district, provider, estado, is_private_owner, tipologia,
-- date_after, date_before) continuam suportadas. Assinaturas, grants e RETURNS inalterados.
-- radar_get_summary continua sem aplicar estado/tipologia (comportamento anterior dos KPIs).

CREATE OR REPLACE FUNCTION public.radar_get_page(
  p_empresa_id UUID,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_filters JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id UUID,
  external_id TEXT,
  title TEXT,
  provider TEXT,
  price NUMERIC,
  location TEXT,
  area NUMERIC,
  rooms TEXT,
  city TEXT,
  district TEXT,
  owner_name TEXT,
  is_private_owner BOOLEAN,
  created_at_first TIMESTAMPTZ,
  short_description TEXT,
  source TEXT,
  status TEXT,
  detected_at TIMESTAMPTZ,
  provider_active BOOLEAN,
  last_seen_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  imported BOOLEAN,
  imported_at TIMESTAMPTZ,
  crm_lead_id UUID,
  score NUMERIC,
  raw_data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  url TEXT,
  is_inactive BOOLEAN,
  is_new BOOLEAN,
  provider_last_execution TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT
      pl.id,
      pl.external_id,
      pl.title,
      pl.provider,
      pl.price,
      pl.location,
      pl.area,
      pl.rooms,
      pl.city,
      pl.district,
      pl.owner_name,
      COALESCE(epl.is_private_owner_override, pl.is_private_owner) AS is_private_owner,
      pl.created_at_first,
      pl.short_description,
      pl.source,
      pl.status,
      pl.detected_at,
      pl.provider_active,
      pl.last_seen_at,
      pl.published_at,
      COALESCE(epl.imported, pl.imported, false) AS imported,
      epl.imported_at AS imported_at,
      COALESCE(epl.crm_lead_id, pl.crm_lead_id) AS crm_lead_id,
      pl.score,
      pl.raw_data,
      pl.created_at,
      pl.updated_at,
      pl.url,
      NOT COALESCE(epl.is_active, true) AS is_inactive,
      pr.last_execution AS provider_last_execution,
      (
        pr.last_started_at IS NOT NULL
        AND pl.detected_at >= pr.last_started_at
      ) AS is_new,
      CASE
        WHEN NULLIF(trim(pl.raw_data->>'tipologia'), '') IS NOT NULL
             AND trim(pl.raw_data->>'tipologia') ~* '^(T|V)(0|[1-9][0-9]*)(\+)?$'
          THEN upper(trim(pl.raw_data->>'tipologia'))
        WHEN pl.title ~* '\yTERRENO\y' THEN 'TERRENO'
        WHEN pl.title ~* '\yV([0-9]+)\y' THEN
          'V' || regexp_replace(substring(upper(pl.title) from '\yV([0-9]+)\y'), '[^0-9]', '', 'g')
        WHEN pl.title ~* '^\s*(MORADIA|ANDAR DE MORADIA)\y'
             AND pl.title ~* '\yT([0-9]+)\y' THEN
          'V' || regexp_replace(substring(upper(pl.title) from '\yT([0-9]+)\y'), '[^0-9]', '', 'g')
        WHEN pl.title ~* '\yT([0-9]+)\y' THEN
          'T' || regexp_replace(substring(upper(pl.title) from '\yT([0-9]+)\y'), '[^0-9]', '', 'g')
        ELSE NULL
      END AS normalized_tipologia
    FROM public.provider_leads pl
    INNER JOIN public.empresa_provider_listings epl
      ON epl.provider_lead_id = pl.id
     AND epl.empresa_id = p_empresa_id
    LEFT JOIN public.provider_registry pr
      ON pr.empresa_id = p_empresa_id
     AND lower(pr.provider_code) = lower(pl.provider)
    WHERE pl.provider_active = true
      AND COALESCE(epl.is_active, true) = true
      AND pl.status IS DISTINCT FROM 'ignored'
      AND EXISTS (
        SELECT 1
        FROM public.usuarios u
        WHERE u.auth_user_id = auth.uid()
          AND u.empresa_id = p_empresa_id
          AND u.ativo = true
      )
  ),
  params AS (
    SELECT
      CASE
        WHEN jsonb_typeof(p_filters->'districts') = 'array'
          THEN ARRAY(SELECT v FROM jsonb_array_elements_text(p_filters->'districts') v WHERE v <> 'todos')
        WHEN COALESCE(p_filters->>'district', 'todos') <> 'todos' THEN ARRAY[p_filters->>'district']
        ELSE ARRAY[]::text[]
      END AS districts,
      CASE
        WHEN jsonb_typeof(p_filters->'providers') = 'array'
          THEN ARRAY(SELECT v FROM jsonb_array_elements_text(p_filters->'providers') v WHERE v <> 'todos')
        WHEN COALESCE(p_filters->>'provider', 'todos') <> 'todos' THEN ARRAY[p_filters->>'provider']
        ELSE ARRAY[]::text[]
      END AS providers,
      CASE
        WHEN jsonb_typeof(p_filters->'estados') = 'array'
          THEN ARRAY(SELECT v FROM jsonb_array_elements_text(p_filters->'estados') v WHERE v <> 'todos')
        WHEN COALESCE(p_filters->>'estado', 'todos') <> 'todos' THEN ARRAY[p_filters->>'estado']
        ELSE ARRAY[]::text[]
      END AS estados,
      CASE
        WHEN jsonb_typeof(p_filters->'private_owner_values') = 'array'
          THEN ARRAY(SELECT v FROM jsonb_array_elements_text(p_filters->'private_owner_values') v)
        WHEN p_filters->>'is_private_owner' IN ('true', 'false') THEN ARRAY[p_filters->>'is_private_owner']
        ELSE ARRAY[]::text[]
      END AS private_values,
      CASE
        WHEN jsonb_typeof(p_filters->'tipologias') = 'array'
          THEN ARRAY(SELECT v FROM jsonb_array_elements_text(p_filters->'tipologias') v WHERE v <> 'todos')
        WHEN COALESCE(p_filters->>'tipologia', 'todos') <> 'todos' THEN ARRAY[p_filters->>'tipologia']
        ELSE ARRAY[]::text[]
      END AS tipologias,
      CASE
        WHEN jsonb_typeof(p_filters->'date_ranges') = 'array' THEN p_filters->'date_ranges'
        ELSE '[]'::jsonb
      END AS date_ranges
  ),
  filtered AS (
    SELECT scoped.*, COUNT(*) OVER() AS total_count
    FROM scoped
    CROSS JOIN params
    WHERE (p_filters->>'city' IS NULL OR city ILIKE '%' || (p_filters->>'city') || '%')
      AND (cardinality(params.districts) = 0 OR district = ANY(params.districts))
      AND (cardinality(params.providers) = 0 OR provider = ANY(params.providers))
      AND (
        cardinality(params.private_values) = 0
        OR cardinality(params.private_values) >= 2
        OR is_private_owner::text = params.private_values[1]
      )
      AND (p_filters->>'date_after' IS NULL OR COALESCE(created_at_first, detected_at) >= (p_filters->>'date_after')::timestamptz)
      AND (p_filters->>'date_before' IS NULL OR COALESCE(created_at_first, detected_at) <= (p_filters->>'date_before')::timestamptz)
      AND (
        jsonb_array_length(params.date_ranges) = 0
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(params.date_ranges) dr
          WHERE (dr->>'after' IS NULL OR COALESCE(created_at_first, detected_at) >= (dr->>'after')::timestamptz)
            AND (dr->>'before' IS NULL OR COALESCE(created_at_first, detected_at) <= (dr->>'before')::timestamptz)
        )
      )
      AND (p_filters->>'min_price' IS NULL OR p_filters->>'min_price' = '' OR price >= (p_filters->>'min_price')::numeric)
      AND (p_filters->>'max_price' IS NULL OR p_filters->>'max_price' = '' OR price <= (p_filters->>'max_price')::numeric)
      AND (
        cardinality(params.tipologias) = 0
        OR EXISTS (
          SELECT 1
          FROM unnest(params.tipologias) t
          WHERE CASE
            WHEN t IN ('T0', 'T1', 'T2', 'T3', 'T4', 'V1', 'V2', 'V3', 'V4') THEN normalized_tipologia = t
            WHEN t = 'T5+' THEN normalized_tipologia ~ '^T([5-9]|[1-9][0-9]+)$'
            WHEN t = 'V5+' THEN normalized_tipologia ~ '^V([5-9]|[1-9][0-9]+)$'
            ELSE normalized_tipologia = t
          END
        )
      )
      AND (
        cardinality(params.estados) = 0
        OR EXISTS (
          SELECT 1
          FROM unnest(params.estados) e
          WHERE (e = 'importado' AND imported = true)
            OR (e = 'novo' AND is_new = true)
            OR (e = 'nao_novo_nao_importado' AND is_new = false AND imported = false)
        )
      )
  )
  SELECT id, external_id, title, provider, price, location, area, rooms, city, district,
    owner_name, is_private_owner, created_at_first, short_description, source, status,
    detected_at, provider_active, last_seen_at, published_at, imported, imported_at, crm_lead_id,
    score, raw_data, created_at, updated_at, url, is_inactive, is_new,
    provider_last_execution, total_count
  FROM filtered
  ORDER BY last_seen_at DESC NULLS LAST, created_at_first DESC NULLS LAST,
    detected_at DESC NULLS LAST, created_at DESC NULLS LAST
  LIMIT p_page_size OFFSET (p_page - 1) * p_page_size;
$$;

CREATE OR REPLACE FUNCTION public.radar_get_summary(
  p_empresa_id UUID,
  p_filters JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (monitorizadas BIGINT, novas BIGINT, importadas BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      CASE
        WHEN jsonb_typeof(p_filters->'districts') = 'array'
          THEN ARRAY(SELECT v FROM jsonb_array_elements_text(p_filters->'districts') v WHERE v <> 'todos')
        WHEN COALESCE(p_filters->>'district', 'todos') <> 'todos' THEN ARRAY[p_filters->>'district']
        ELSE ARRAY[]::text[]
      END AS districts,
      CASE
        WHEN jsonb_typeof(p_filters->'providers') = 'array'
          THEN ARRAY(SELECT v FROM jsonb_array_elements_text(p_filters->'providers') v WHERE v <> 'todos')
        WHEN COALESCE(p_filters->>'provider', 'todos') <> 'todos' THEN ARRAY[p_filters->>'provider']
        ELSE ARRAY[]::text[]
      END AS providers,
      CASE
        WHEN jsonb_typeof(p_filters->'private_owner_values') = 'array'
          THEN ARRAY(SELECT v FROM jsonb_array_elements_text(p_filters->'private_owner_values') v)
        WHEN p_filters->>'is_private_owner' IN ('true', 'false') THEN ARRAY[p_filters->>'is_private_owner']
        ELSE ARRAY[]::text[]
      END AS private_values,
      CASE
        WHEN jsonb_typeof(p_filters->'date_ranges') = 'array' THEN p_filters->'date_ranges'
        ELSE '[]'::jsonb
      END AS date_ranges
  ),
  scoped AS (
    SELECT
      COALESCE(epl.imported, pl.imported, false) AS imported,
      pr.last_started_at,
      pl.detected_at
    FROM public.provider_leads pl
    INNER JOIN public.empresa_provider_listings epl
      ON epl.provider_lead_id = pl.id
     AND epl.empresa_id = p_empresa_id
    LEFT JOIN public.provider_registry pr
      ON pr.empresa_id = p_empresa_id
     AND lower(pr.provider_code) = lower(pl.provider)
    CROSS JOIN params
    WHERE pl.provider_active = true
      AND COALESCE(epl.is_active, true) = true
      AND pl.status IS DISTINCT FROM 'ignored'
      AND EXISTS (
        SELECT 1
        FROM public.usuarios u
        WHERE u.auth_user_id = auth.uid()
          AND u.empresa_id = p_empresa_id
          AND u.ativo = true
      )
      AND (p_filters->>'city' IS NULL OR pl.city ILIKE '%' || (p_filters->>'city') || '%')
      AND (cardinality(params.districts) = 0 OR pl.district = ANY(params.districts))
      AND (cardinality(params.providers) = 0 OR pl.provider = ANY(params.providers))
      AND (
        cardinality(params.private_values) = 0
        OR cardinality(params.private_values) >= 2
        OR COALESCE(epl.is_private_owner_override, pl.is_private_owner)::text = params.private_values[1]
      )
      AND (p_filters->>'date_after' IS NULL OR COALESCE(pl.created_at_first, pl.detected_at) >= (p_filters->>'date_after')::timestamptz)
      AND (p_filters->>'date_before' IS NULL OR COALESCE(pl.created_at_first, pl.detected_at) <= (p_filters->>'date_before')::timestamptz)
      AND (
        jsonb_array_length(params.date_ranges) = 0
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(params.date_ranges) dr
          WHERE (dr->>'after' IS NULL OR COALESCE(pl.created_at_first, pl.detected_at) >= (dr->>'after')::timestamptz)
            AND (dr->>'before' IS NULL OR COALESCE(pl.created_at_first, pl.detected_at) <= (dr->>'before')::timestamptz)
        )
      )
      AND (p_filters->>'min_price' IS NULL OR p_filters->>'min_price' = '' OR pl.price >= (p_filters->>'min_price')::numeric)
      AND (p_filters->>'max_price' IS NULL OR p_filters->>'max_price' = '' OR pl.price <= (p_filters->>'max_price')::numeric)
  )
  SELECT
    COUNT(*) AS monitorizadas,
    COUNT(*) FILTER (
      WHERE last_started_at IS NOT NULL
        AND detected_at >= last_started_at
    ) AS novas,
    COUNT(*) FILTER (WHERE imported = true) AS importadas
  FROM scoped;
$$;

GRANT EXECUTE ON FUNCTION public.radar_get_page(UUID, INTEGER, INTEGER, JSONB)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.radar_get_summary(UUID, JSONB)
  TO authenticated, service_role;
