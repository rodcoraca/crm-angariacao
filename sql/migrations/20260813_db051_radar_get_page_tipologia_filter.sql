-- DB-051: adiciona filtro de tipologia ao Radar sem remover/recriar a função existente.
-- A tipologia é normalizada a partir do título do anúncio, sem criar coluna nova.

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
  crm_lead_id UUID,
  score NUMERIC,
  raw_data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  url TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH title_tipologia AS (
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
      pl.is_private_owner,
      pl.created_at_first,
      pl.short_description,
      pl.source,
      pl.status,
      pl.detected_at,
      pl.provider_active,
      pl.last_seen_at,
      pl.published_at,
      pl.imported,
      pl.crm_lead_id,
      pl.score,
      pl.raw_data,
      pl.created_at,
      pl.updated_at,
      pl.url,
      CASE
        WHEN NULLIF(trim(pl.raw_data->>'tipologia'), '') IS NOT NULL
             AND trim(pl.raw_data->>'tipologia') ~* '^(T|V)(0|[1-9][0-9]*)(\+)?$' THEN
          upper(trim(pl.raw_data->>'tipologia'))
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
    WHERE epl.empresa_id = p_empresa_id
  ),
  base AS (
    SELECT
      tt.id,
      tt.external_id,
      tt.title,
      tt.provider,
      tt.price,
      tt.location,
      tt.area,
      tt.rooms,
      tt.city,
      tt.district,
      tt.owner_name,
      tt.is_private_owner,
      tt.created_at_first,
      tt.short_description,
      tt.source,
      tt.status,
      tt.detected_at,
      tt.provider_active,
      tt.last_seen_at,
      tt.published_at,
      tt.imported,
      tt.crm_lead_id,
      tt.score,
      tt.raw_data,
      tt.created_at,
      tt.updated_at,
      tt.url,
      COUNT(*) OVER() AS total_count
    FROM title_tipologia tt
    WHERE tt.provider_active = true
      AND (
        p_filters->>'city' IS NULL
        OR tt.city ILIKE '%' || (p_filters->>'city') || '%'
      )
      AND (
        p_filters->>'district' IS NULL
        OR p_filters->>'district' = 'todos'
        OR tt.district = p_filters->>'district'
      )
      AND (
        p_filters->>'provider' IS NULL
        OR p_filters->>'provider' = 'todos'
        OR tt.provider = p_filters->>'provider'
      )
      AND (
        p_filters->>'is_private_owner' IS NULL
        OR (
          (p_filters->>'is_private_owner' = 'true' AND tt.is_private_owner = true)
          OR (p_filters->>'is_private_owner' = 'false' AND tt.is_private_owner = false)
        )
      )
      AND (
        (p_filters->>'date_after' IS NULL)
        OR (COALESCE(tt.created_at_first, tt.detected_at) >= (p_filters->>'date_after')::timestamptz)
      )
      AND (
        (p_filters->>'date_before' IS NULL)
        OR (COALESCE(tt.created_at_first, tt.detected_at) <= (p_filters->>'date_before')::timestamptz)
      )
      AND (
        (p_filters->>'min_price' IS NULL OR p_filters->>'min_price' = '')
        OR tt.price >= (p_filters->>'min_price')::numeric
      )
      AND (
        (p_filters->>'max_price' IS NULL OR p_filters->>'max_price' = '')
        OR tt.price <= (p_filters->>'max_price')::numeric
      )
      AND (
        p_filters->>'tipologia' IS NULL
        OR p_filters->>'tipologia' = 'todos'
        OR (
          CASE
            WHEN p_filters->>'tipologia' = 'T0' THEN tt.normalized_tipologia = 'T0'
            WHEN p_filters->>'tipologia' = 'T1' THEN tt.normalized_tipologia = 'T1'
            WHEN p_filters->>'tipologia' = 'T2' THEN tt.normalized_tipologia = 'T2'
            WHEN p_filters->>'tipologia' = 'T3' THEN tt.normalized_tipologia = 'T3'
            WHEN p_filters->>'tipologia' = 'T4' THEN tt.normalized_tipologia = 'T4'
            WHEN p_filters->>'tipologia' = 'T5+' THEN tt.normalized_tipologia ~ '^T([5-9]|[1-9][0-9]+)$'
            WHEN p_filters->>'tipologia' = 'V1' THEN tt.normalized_tipologia = 'V1'
            WHEN p_filters->>'tipologia' = 'V2' THEN tt.normalized_tipologia = 'V2'
            WHEN p_filters->>'tipologia' = 'V3' THEN tt.normalized_tipologia = 'V3'
            WHEN p_filters->>'tipologia' = 'V4' THEN tt.normalized_tipologia = 'V4'
            WHEN p_filters->>'tipologia' = 'V5+' THEN tt.normalized_tipologia ~ '^V([5-9]|[1-9][0-9]+)$'
            ELSE true
          END
        )
      )
      AND (
        (p_filters->>'estado' IS NULL OR p_filters->>'estado' = 'todos')
        OR (
          (p_filters->>'estado' = 'importado' AND tt.imported = true)
          OR (p_filters->>'estado' = 'ignorado' AND tt.status = 'ignored')
          OR (
            p_filters->>'estado' = 'novo'
            AND (tt.imported IS NULL OR tt.imported = false)
            AND (tt.status IS NULL OR tt.status != 'ignored')
          )
          OR (
            p_filters->>'estado' NOT IN ('importado', 'ignorado', 'novo', 'todos')
            AND (tt.status IS NULL OR tt.status != 'ignored')
          )
        )
      )
  )
  SELECT *
  FROM base
  ORDER BY
    created_at DESC NULLS LAST,
    id DESC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;

COMMENT ON FUNCTION public.radar_get_page(UUID, INTEGER, INTEGER, JSONB)
IS 'RPC server-side do Radar para scope por empresa_provider_listings, filtros, ordenação e paginação sem depender de query PostgREST relacional do getPage().';

GRANT EXECUTE ON FUNCTION public.radar_get_page(UUID, INTEGER, INTEGER, JSONB)
  TO authenticated, service_role;
