-- DB-045: Ciclo de vida de oportunidades sincronizadas (RC1.5.2)
-- Adiciona provider_active e last_seen_at a provider_leads.
-- Sem alteração de RLS, RBAC ou políticas existentes.

ALTER TABLE public.provider_leads
  ADD COLUMN IF NOT EXISTS provider_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_provider_leads_lifecycle
  ON public.provider_leads (empresa_id, provider, provider_active);

COMMENT ON COLUMN public.provider_leads.provider_active IS 'Indica se o anúncio continua visível no provider na última sincronização.';
COMMENT ON COLUMN public.provider_leads.last_seen_at IS 'Timestamp da última sincronização em que o anúncio foi encontrado.';
