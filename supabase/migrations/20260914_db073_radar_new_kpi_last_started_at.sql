-- DB-073: Radar "Novas" usa a janela da última execução iniciada por provider.
-- A janela é independente por provider e tenant; não depende de imported.

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
  filtered AS (
    SELECT scoped.*, COUNT(*) OVER() AS total_count
    FROM scoped
    WHERE (p_filters->>'city' IS NULL OR city ILIKE '%' || (p_filters->>'city') || '%')
      AND (p_filters->>'district' IS NULL OR p_filters->>'district' = 'todos' OR district = p_filters->>'district')
      AND (p_filters->>'provider' IS NULL OR p_filters->>'provider' = 'todos' OR provider = p_filters->>'provider')
      AND (
        p_filters->>'is_private_owner' IS NULL
        OR (p_filters->>'is_private_owner' = 'true' AND is_private_owner = true)
        OR (p_filters->>'is_private_owner' = 'false' AND is_private_owner = false)
      )
      AND (p_filters->>'date_after' IS NULL OR COALESCE(created_at_first, detected_at) >= (p_filters->>'date_after')::timestamptz)
      AND (p_filters->>'date_before' IS NULL OR COALESCE(created_at_first, detected_at) <= (p_filters->>'date_before')::timestamptz)
      AND (p_filters->>'min_price' IS NULL OR p_filters->>'min_price' = '' OR price >= (p_filters->>'min_price')::numeric)
      AND (p_filters->>'max_price' IS NULL OR p_filters->>'max_price' = '' OR price <= (p_filters->>'max_price')::numeric)
      AND (
        p_filters->>'tipologia' IS NULL OR p_filters->>'tipologia' = 'todos'
        OR (CASE
          WHEN p_filters->>'tipologia' = 'T0' THEN normalized_tipologia = 'T0'
          WHEN p_filters->>'tipologia' = 'T1' THEN normalized_tipologia = 'T1'
          WHEN p_filters->>'tipologia' = 'T2' THEN normalized_tipologia = 'T2'
          WHEN p_filters->>'tipologia' = 'T3' THEN normalized_tipologia = 'T3'
          WHEN p_filters->>'tipologia' = 'T4' THEN normalized_tipologia = 'T4'
          WHEN p_filters->>'tipologia' = 'T5+' THEN normalized_tipologia ~ '^T([5-9]|[1-9][0-9]+)$'
          WHEN p_filters->>'tipologia' = 'V1' THEN normalized_tipologia = 'V1'
          WHEN p_filters->>'tipologia' = 'V2' THEN normalized_tipologia = 'V2'
          WHEN p_filters->>'tipologia' = 'V3' THEN normalized_tipologia = 'V3'
          WHEN p_filters->>'tipologia' = 'V4' THEN normalized_tipologia = 'V4'
          WHEN p_filters->>'tipologia' = 'V5+' THEN normalized_tipologia ~ '^V([5-9]|[1-9][0-9]+)$'
          ELSE true
        END)
      )
      AND (
        p_filters->>'estado' IS NULL OR p_filters->>'estado' = 'todos'
        OR (p_filters->>'estado' = 'importado' AND imported = true)
        OR (p_filters->>'estado' = 'novo' AND is_new = true)
      )
  )
  SELECT id, external_id, title, provider, price, location, area, rooms, city, district,
    owner_name, is_private_owner, created_at_first, short_description, source, status,
    detected_at, provider_active, last_seen_at, published_at, imported, crm_lead_id,
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
  WITH scoped AS (
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
      AND (p_filters->>'district' IS NULL OR p_filters->>'district' = 'todos' OR pl.district = p_filters->>'district')
      AND (p_filters->>'provider' IS NULL OR p_filters->>'provider' = 'todos' OR pl.provider = p_filters->>'provider')
      AND (p_filters->>'is_private_owner' IS NULL
        OR (p_filters->>'is_private_owner' = 'true' AND COALESCE(epl.is_private_owner_override, pl.is_private_owner) = true)
        OR (p_filters->>'is_private_owner' = 'false' AND COALESCE(epl.is_private_owner_override, pl.is_private_owner) = false))
      AND (p_filters->>'date_after' IS NULL OR COALESCE(pl.created_at_first, pl.detected_at) >= (p_filters->>'date_after')::timestamptz)
      AND (p_filters->>'date_before' IS NULL OR COALESCE(pl.created_at_first, pl.detected_at) <= (p_filters->>'date_before')::timestamptz)
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

GRANT EXECUTE ON FUNCTION public.radar_get_page(UUID, INTEGER, INTEGER, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.radar_get_summary(UUID, JSONB) TO authenticated, service_role;