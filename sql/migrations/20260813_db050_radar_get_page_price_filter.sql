-- DB-050: adiciona filtros de preço na RPC do Radar, sem remover/recriar a função existente.

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
  WITH base AS (
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
      COUNT(*) OVER() AS total_count
    FROM public.provider_leads pl
    INNER JOIN public.empresa_provider_listings epl
      ON epl.provider_lead_id = pl.id
    WHERE epl.empresa_id = p_empresa_id
      AND pl.provider_active = true
      AND (
        p_filters->>'city' IS NULL
        OR pl.city ILIKE '%' || (p_filters->>'city') || '%'
      )
      AND (
        p_filters->>'district' IS NULL
        OR p_filters->>'district' = 'todos'
        OR pl.district = p_filters->>'district'
      )
      AND (
        p_filters->>'provider' IS NULL
        OR p_filters->>'provider' = 'todos'
        OR pl.provider = p_filters->>'provider'
      )
      AND (
        p_filters->>'is_private_owner' IS NULL
        OR (
          (p_filters->>'is_private_owner' = 'true' AND pl.is_private_owner = true)
          OR (p_filters->>'is_private_owner' = 'false' AND pl.is_private_owner = false)
        )
      )
      AND (
        (p_filters->>'date_after' IS NULL)
        OR (COALESCE(pl.created_at_first, pl.detected_at) >= (p_filters->>'date_after')::timestamptz)
      )
      AND (
        (p_filters->>'date_before' IS NULL)
        OR (COALESCE(pl.created_at_first, pl.detected_at) <= (p_filters->>'date_before')::timestamptz)
      )
      AND (
        (p_filters->>'min_price' IS NULL OR p_filters->>'min_price' = '')
        OR pl.price >= (p_filters->>'min_price')::numeric
      )
      AND (
        (p_filters->>'max_price' IS NULL OR p_filters->>'max_price' = '')
        OR pl.price <= (p_filters->>'max_price')::numeric
      )
      AND (
        (p_filters->>'estado' IS NULL OR p_filters->>'estado' = 'todos')
        OR (
          (p_filters->>'estado' = 'importado' AND pl.imported = true)
          OR (p_filters->>'estado' = 'ignorado' AND pl.status = 'ignored')
          OR (
            p_filters->>'estado' = 'novo'
            AND (pl.imported IS NULL OR pl.imported = false)
            AND (pl.status IS NULL OR pl.status != 'ignored')
          )
          OR (
            p_filters->>'estado' NOT IN ('importado', 'ignorado', 'novo', 'todos')
            AND (pl.status IS NULL OR pl.status != 'ignored')
          )
        )
      )
  )
  SELECT *
  FROM base
  ORDER BY
    last_seen_at DESC NULLS LAST,
    created_at_first DESC NULLS LAST,
    detected_at DESC NULLS LAST,
    published_at DESC NULLS LAST,
    created_at DESC NULLS LAST
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;

COMMENT ON FUNCTION public.radar_get_page(UUID, INTEGER, INTEGER, JSONB)
IS 'RPC server-side do Radar para scope por empresa_provider_listings, filtros, ordenação e paginação sem depender de query PostgREST relacional do getPage().';

GRANT EXECUTE ON FUNCTION public.radar_get_page(UUID, INTEGER, INTEGER, JSONB)
  TO authenticated, service_role;
