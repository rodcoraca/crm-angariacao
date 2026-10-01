-- DB-084: Repair historical Imovirtual locations.
-- Scope: Imovirtual only. Fills missing/invalid normalized location fields
-- from the preserved raw_data payload. Does not overwrite valid values.

BEGIN;

WITH normalized AS (
  SELECT
    id,

    NULLIF(BTRIM(COALESCE(
      NULLIF(raw_data -> 'location' -> 'address' -> 'city' ->> 'name', ''),
      NULLIF(raw_data -> 'location' -> 'city' ->> 'name', ''),
      NULLIF(raw_data -> 'city' ->> 'name', ''),
      NULLIF(raw_data ->> 'city', '')
    )), '') AS city_value,

    NULLIF(BTRIM(COALESCE(
      NULLIF(raw_data -> 'location' -> 'address' -> 'province' ->> 'name', ''),
      NULLIF(raw_data -> 'location' -> 'province' ->> 'name', ''),
      NULLIF(raw_data -> 'province' ->> 'name', ''),
      NULLIF(raw_data ->> 'province', ''),
      NULLIF(raw_data ->> 'district', '')
    )), '') AS district_value
  FROM public.provider_leads
  WHERE provider = 'imovirtual'
)
UPDATE public.provider_leads AS p
SET
  city = CASE
    WHEN p.city IS NULL OR BTRIM(p.city) = '' OR UPPER(BTRIM(p.city)) = 'N/A'
      THEN n.city_value
    ELSE p.city
  END,
  district = CASE
    WHEN p.district IS NULL OR BTRIM(p.district) = '' OR UPPER(BTRIM(p.district)) = 'N/A'
      THEN n.district_value
    ELSE p.district
  END,
  location = CASE
    WHEN p.location IS NULL OR BTRIM(p.location) = '' OR UPPER(BTRIM(p.location)) = 'N/A'
      THEN NULLIF(CONCAT_WS(', ', n.city_value, n.district_value), '')
    ELSE p.location
  END,
  updated_at = now()
FROM normalized AS n
WHERE p.id = n.id
  AND (
    (
      (p.city IS NULL OR BTRIM(p.city) = '' OR UPPER(BTRIM(p.city)) = 'N/A')
      AND n.city_value IS NOT NULL
    )
    OR
    (
      (p.district IS NULL OR BTRIM(p.district) = '' OR UPPER(BTRIM(p.district)) = 'N/A')
      AND n.district_value IS NOT NULL
    )
    OR
    (
      (p.location IS NULL OR BTRIM(p.location) = '' OR UPPER(BTRIM(p.location)) = 'N/A')
      AND (n.city_value IS NOT NULL OR n.district_value IS NOT NULL)
    )
  );

COMMIT;
