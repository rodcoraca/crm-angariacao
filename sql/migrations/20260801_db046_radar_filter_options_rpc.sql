-- DB-046: RPC para opções de filtro do Radar com SELECT DISTINCT em SQL (RC1.5.7.2A)
-- Substitui deduplicação JavaScript por um único scan com CTE MATERIALIZED.
-- Sem alteração de schema, RLS, RBAC ou políticas existentes.

CREATE OR REPLACE FUNCTION public.radar_get_filter_options(
  p_empresa_id   UUID,
  p_district     TEXT        DEFAULT NULL,
  p_provider     TEXT        DEFAULT NULL,
  p_estado       TEXT        DEFAULT NULL,
  p_is_private   BOOLEAN     DEFAULT NULL,
  p_date_after   TIMESTAMPTZ DEFAULT NULL,
  p_date_before  TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH scope AS MATERIALIZED (
    SELECT pl.district, pl.city, pl.provider
    FROM public.provider_leads pl
    WHERE pl.provider_active = true
      AND EXISTS (
        SELECT 1
        FROM public.empresa_provider_listings epl
        WHERE epl.empresa_id = p_empresa_id
          AND epl.provider_lead_id = pl.id
      )
      AND CASE
            WHEN p_estado = 'importado' THEN (pl.imported = true)
            WHEN p_estado = 'novo'      THEN ((pl.imported IS NULL OR pl.imported = false)
                                              AND (pl.status IS NULL OR pl.status != 'ignored'))
            WHEN p_estado = 'ignorado'  THEN (pl.status = 'ignored')
            ELSE (pl.status IS NULL OR pl.status != 'ignored')
          END
      AND (p_district  IS NULL OR p_district  = 'todos' OR pl.district        =  p_district)
      AND (p_provider  IS NULL OR p_provider  = 'todos' OR pl.provider        =  p_provider)
      AND (p_is_private IS NULL                         OR pl.is_private_owner = p_is_private)
      AND (p_date_after  IS NULL OR COALESCE(pl.created_at_first, pl.detected_at) >= p_date_after)
      AND (p_date_before IS NULL OR COALESCE(pl.created_at_first, pl.detected_at) <= p_date_before)
  )
  SELECT json_build_object(
    'districts', COALESCE(
      (SELECT json_agg(d ORDER BY d)
       FROM (SELECT DISTINCT district AS d FROM scope WHERE district IS NOT NULL) t),
      '[]'::json
    ),
    'cities', COALESCE(
      (SELECT json_agg(c ORDER BY c)
       FROM (SELECT DISTINCT city AS c FROM scope WHERE city IS NOT NULL) t),
      '[]'::json
    ),
    'providers', COALESCE(
      (SELECT json_agg(p ORDER BY p)
       FROM (SELECT DISTINCT provider AS p FROM scope WHERE provider IS NOT NULL) t),
      '[]'::json
    )
  );
$$;

COMMENT ON FUNCTION public.radar_get_filter_options(UUID, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ)
IS 'RC1.5.7.2A — Opções de filtro do Radar via SELECT DISTINCT em SQL.
Objectivo: eliminar deduplicação JavaScript em getFilterOptions() do RadarRepository.
Utilização: supabase.rpc("radar_get_filter_options", params) — devolve { districts, cities, providers }.
Um único scan da tabela provider_leads via CTE MATERIALIZED; os DISTINCT operam sobre o resultado em memória.
p_city excluído intencionalmente: a pesquisa textual por cidade pertence à UI, não às listas de filtros.';

GRANT EXECUTE ON FUNCTION public.radar_get_filter_options(UUID, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;
