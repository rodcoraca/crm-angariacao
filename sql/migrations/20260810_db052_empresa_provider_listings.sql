-- ============================================================
-- DB-052
-- Junction: empresa ↔ provider_leads (catálogo global)
-- Fase 1 do plano de migração provider_leads para catálogo global.
-- Sem alteração a provider_leads ou a dados existentes.
-- ============================================================

BEGIN;

-- ============================================================
-- Tabela
-- ============================================================

CREATE TABLE IF NOT EXISTS public.empresa_provider_listings (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id        UUID        NOT NULL
                      REFERENCES public.empresas (id) ON DELETE RESTRICT,
  provider_lead_id  UUID        NOT NULL
                      REFERENCES public.provider_leads (id) ON DELETE CASCADE,
  imported          BOOLEAN     NOT NULL DEFAULT false,
  imported_at       TIMESTAMPTZ,
  imported_by       UUID,
  crm_lead_id       UUID,
  first_seen_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT empresa_provider_listings_empresa_lead_unique
    UNIQUE (empresa_id, provider_lead_id)
);

-- ============================================================
-- Índices
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_empresa_provider_listings_empresa
  ON public.empresa_provider_listings (empresa_id);

CREATE INDEX IF NOT EXISTS idx_empresa_provider_listings_lead
  ON public.empresa_provider_listings (provider_lead_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.empresa_provider_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_provider_listings FORCE ROW LEVEL SECURITY;

-- SELECT

DROP POLICY IF EXISTS empresa_provider_listings_select
  ON public.empresa_provider_listings;

CREATE POLICY empresa_provider_listings_select
  ON public.empresa_provider_listings
  FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id
      FROM public.usuarios
      WHERE auth_user_id = auth.uid()
        AND ativo = true
    )
  );

-- INSERT

DROP POLICY IF EXISTS empresa_provider_listings_insert
  ON public.empresa_provider_listings;

CREATE POLICY empresa_provider_listings_insert
  ON public.empresa_provider_listings
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id
      FROM public.usuarios
      WHERE auth_user_id = auth.uid()
        AND ativo = true
    )
  );

-- UPDATE

DROP POLICY IF EXISTS empresa_provider_listings_update
  ON public.empresa_provider_listings;

CREATE POLICY empresa_provider_listings_update
  ON public.empresa_provider_listings
  FOR UPDATE
  TO authenticated, service_role
  USING (
    empresa_id IN (
      SELECT empresa_id
      FROM public.usuarios
      WHERE auth_user_id = auth.uid()
        AND ativo = true
    )
  )
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id
      FROM public.usuarios
      WHERE auth_user_id = auth.uid()
        AND ativo = true
    )
  );

-- DELETE — apenas admins

DROP POLICY IF EXISTS empresa_provider_listings_delete
  ON public.empresa_provider_listings;

CREATE POLICY empresa_provider_listings_delete
  ON public.empresa_provider_listings
  FOR DELETE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id
      FROM public.usuarios
      WHERE auth_user_id = auth.uid()
        AND ativo = true
    )
    AND is_admin()
  );

-- ============================================================
-- Comentários
-- ============================================================

COMMENT ON TABLE  public.empresa_provider_listings IS
  'Relação empresa ↔ provider_leads. Fase 1 da migração para catálogo global de anúncios (DB-052).';

COMMENT ON COLUMN public.empresa_provider_listings.empresa_id       IS 'Empresa que observou este anúncio.';
COMMENT ON COLUMN public.empresa_provider_listings.provider_lead_id IS 'Anúncio canônico no catálogo global (provider_leads).';
COMMENT ON COLUMN public.empresa_provider_listings.imported         IS 'Indica se esta empresa importou o anúncio para leads CRM.';
COMMENT ON COLUMN public.empresa_provider_listings.imported_by      IS 'Utilizador que realizou a importação (usuarios.id).';
COMMENT ON COLUMN public.empresa_provider_listings.crm_lead_id      IS 'Lead CRM criada nesta empresa a partir deste anúncio (leads.id).';
COMMENT ON COLUMN public.empresa_provider_listings.first_seen_at    IS 'Timestamp em que esta empresa observou o anúncio pela primeira vez.';

COMMIT;
