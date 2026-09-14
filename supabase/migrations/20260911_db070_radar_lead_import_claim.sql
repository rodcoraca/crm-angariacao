-- DB-070: claim atomico para importacao manual de anuncios do Radar.

ALTER TABLE public.empresa_provider_listings
  ADD COLUMN IF NOT EXISTS import_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS import_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS import_error TEXT;

ALTER TABLE public.empresa_provider_listings
  DROP CONSTRAINT IF EXISTS empresa_provider_listings_import_status_check;

ALTER TABLE public.empresa_provider_listings
  ADD CONSTRAINT empresa_provider_listings_import_status_check
  CHECK (import_status IN ('pending', 'importing', 'imported', 'failed'));

CREATE INDEX IF NOT EXISTS idx_empresa_provider_listings_import_status
  ON public.empresa_provider_listings (empresa_id, import_status, provider_lead_id);

CREATE OR REPLACE FUNCTION public.radar_claim_lead_import(
  p_empresa_id UUID,
  p_provider_lead_id UUID,
  p_user_id UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_listing public.empresa_provider_listings%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.auth_user_id = auth.uid()
      AND u.empresa_id = p_empresa_id
      AND u.ativo = true
  ) THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'unauthorized');
  END IF;

  UPDATE public.empresa_provider_listings
  SET import_status = 'importing', import_started_at = now(), import_error = NULL,
      imported_by = p_user_id, updated_at = now()
  WHERE empresa_id = p_empresa_id AND provider_lead_id = p_provider_lead_id
    AND imported = false
    AND (import_status IN ('pending', 'failed') OR
      (import_status = 'importing' AND import_started_at < now() - interval '15 minutes'))
  RETURNING * INTO current_listing;

  IF FOUND THEN RETURN jsonb_build_object('status', 'claimed'); END IF;

  SELECT * INTO current_listing FROM public.empresa_provider_listings
  WHERE empresa_id = p_empresa_id AND provider_lead_id = p_provider_lead_id;

  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'error', 'code', 'listing_not_found'); END IF;
  IF current_listing.imported OR current_listing.import_status = 'imported' THEN
    RETURN jsonb_build_object('status', 'already_imported');
  END IF;
  IF current_listing.import_status = 'importing' THEN
    RETURN jsonb_build_object('status', 'processing');
  END IF;
  RETURN jsonb_build_object('status', 'unavailable');
END;
$$;

CREATE OR REPLACE FUNCTION public.radar_complete_lead_import(
  p_empresa_id UUID, p_provider_lead_id UUID, p_crm_lead_id UUID, p_user_id UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.auth_user_id = auth.uid() AND u.empresa_id = p_empresa_id AND u.ativo = true
  ) THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'unauthorized');
  END IF;

  UPDATE public.empresa_provider_listings
  SET imported = true, import_status = 'imported', crm_lead_id = p_crm_lead_id,
      imported_at = now(), imported_by = p_user_id, import_error = NULL, updated_at = now()
  WHERE empresa_id = p_empresa_id AND provider_lead_id = p_provider_lead_id
    AND import_status = 'importing';

  IF FOUND THEN RETURN jsonb_build_object('status', 'completed'); END IF;
  RETURN jsonb_build_object('status', 'not_claimed');
END;
$$;

CREATE OR REPLACE FUNCTION public.radar_fail_lead_import(
  p_empresa_id UUID, p_provider_lead_id UUID, p_error TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.auth_user_id = auth.uid() AND u.empresa_id = p_empresa_id AND u.ativo = true
  ) THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'unauthorized');
  END IF;

  UPDATE public.empresa_provider_listings
  SET imported = false, import_status = 'failed',
      import_error = left(COALESCE(p_error, 'Falha na importacao'), 500), updated_at = now()
  WHERE empresa_id = p_empresa_id AND provider_lead_id = p_provider_lead_id
    AND import_status = 'importing';

  RETURN jsonb_build_object('status', CASE WHEN FOUND THEN 'failed' ELSE 'not_claimed' END);
END;
$$;

REVOKE ALL ON FUNCTION public.radar_claim_lead_import(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.radar_complete_lead_import(UUID, UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.radar_fail_lead_import(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.radar_claim_lead_import(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.radar_complete_lead_import(UUID, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.radar_fail_lead_import(UUID, UUID, TEXT) TO authenticated;

COMMENT ON COLUMN public.empresa_provider_listings.import_status IS
  'Estado do claim atomico da importacao manual do anuncio no CRM.';