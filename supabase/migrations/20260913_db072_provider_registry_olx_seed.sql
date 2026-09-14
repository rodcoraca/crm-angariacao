BEGIN;

INSERT INTO public.provider_registry (
  empresa_id,
  provider_code,
  enabled,
  sync_running,
  last_execution,
  next_execution,
  last_error,
  interval_minutes,
  total_runs,
  total_errors
)
SELECT
  e.id,
  'olx',
  true,
  false,
  NULL,
  NULL,
  NULL,
  240,
  0,
  0
FROM public.empresas e
ON CONFLICT (empresa_id, provider_code) DO NOTHING;

COMMIT;