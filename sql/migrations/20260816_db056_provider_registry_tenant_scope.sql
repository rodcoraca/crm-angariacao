BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.provider_registry
    WHERE empresa_id IS NULL
  ) THEN
    RAISE EXCEPTION 'provider_registry contém empresa_id NULL. Corrija antes da migração SaaS.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.provider_registry
    GROUP BY empresa_id, provider_code
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'provider_registry contém duplicidade em (empresa_id, provider_code). Corrija antes da migração SaaS.';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.provider_registry'::regclass
      AND conname = 'provider_registry_provider_code_key'
  ) THEN
    ALTER TABLE public.provider_registry
      DROP CONSTRAINT provider_registry_provider_code_key;
  END IF;
END $$;

ALTER TABLE public.provider_registry
  ALTER COLUMN empresa_id SET NOT NULL;

ALTER TABLE public.provider_registry
  ADD CONSTRAINT provider_registry_empresa_provider_key
  UNIQUE (empresa_id, provider_code);

COMMIT;
