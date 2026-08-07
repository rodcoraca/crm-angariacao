-- DB-050: Perfis de Sincronização de Providers (RC1.6.1.1 / ADR-004)
-- Cria a tabela provider_sync_profiles para persistência da configuração de sincronização por empresa e provider.
-- Um perfil por empresa + provider (UNIQUE constraint).

BEGIN;

CREATE TABLE IF NOT EXISTS public.provider_sync_profiles (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID        NOT NULL,
  provider    TEXT        NOT NULL,
  config      JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT provider_sync_profiles_empresa_provider_unique
    UNIQUE (empresa_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_provider_sync_profiles_lookup
  ON public.provider_sync_profiles (empresa_id, provider);

ALTER TABLE public.provider_sync_profiles ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- SELECT
---------------------------------------------------------

DROP POLICY IF EXISTS provider_sync_profiles_select
ON provider_sync_profiles;

CREATE POLICY provider_sync_profiles_select
ON provider_sync_profiles
FOR SELECT
TO authenticated
USING (
    empresa_id IN (
        SELECT empresa_id
        FROM usuarios
        WHERE auth_user_id = auth.uid()
          AND ativo = true
    )
);

---------------------------------------------------------
-- INSERT
---------------------------------------------------------

DROP POLICY IF EXISTS provider_sync_profiles_insert
ON provider_sync_profiles;

CREATE POLICY provider_sync_profiles_insert
ON provider_sync_profiles
FOR INSERT
TO authenticated
WITH CHECK (
    empresa_id IN (
        SELECT empresa_id
        FROM usuarios
        WHERE auth_user_id = auth.uid()
          AND ativo = true
    )
);

---------------------------------------------------------
-- UPDATE
---------------------------------------------------------

DROP POLICY IF EXISTS provider_sync_profiles_update
ON provider_sync_profiles;

CREATE POLICY provider_sync_profiles_update
ON provider_sync_profiles
FOR UPDATE
TO authenticated
USING (
    empresa_id IN (
        SELECT empresa_id
        FROM usuarios
        WHERE auth_user_id = auth.uid()
          AND ativo = true
    )
)
WITH CHECK (
    empresa_id IN (
        SELECT empresa_id
        FROM usuarios
        WHERE auth_user_id = auth.uid()
          AND ativo = true
    )
);

COMMENT ON TABLE  public.provider_sync_profiles         IS 'Perfil de configuração de sincronização por empresa e provider (ADR-004 RC1.6.1.1).';
COMMENT ON COLUMN public.provider_sync_profiles.config  IS 'Configuração em JSONB: { districts: [...], advertisers: { private: bool, professional: bool } }. Extensível sem alterações ao schema.';

COMMIT;
