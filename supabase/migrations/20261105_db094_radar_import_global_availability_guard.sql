-- DB-094: impedir importacao de anuncios globalmente inativos ou
-- desativados manualmente pela empresa.
--
-- provider_leads.provider_active representa a disponibilidade global.
-- empresa_provider_listings.is_active representa a decisao da empresa.

BEGIN;

CREATE OR REPLACE FUNCTION public.radar_claim_lead_import(
  p_empresa_id UUID,
  p_provider_lead_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_listing public.empresa_provider_listings%ROWTYPE;
  actor_id UUID;
  existing_crm_lead_id UUID;
  global_provider_active BOOLEAN;
BEGIN
  SELECT u.id INTO actor_id
  FROM public.usuarios u
  WHERE u.auth_user_id = auth.uid()
    AND u.empresa_id = p_empresa_id
    AND u.ativo = true;

  IF actor_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'unauthorized');
  END IF;

  SELECT * INTO current_listing
  FROM public.empresa_provider_listings
  WHERE empresa_id = p_empresa_id
    AND provider_lead_id = p_provider_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'listing_not_found');
  END IF;

  -- Preservar a recuperacao idempotente de Leads ja criadas.
  SELECT l.id INTO existing_crm_lead_id
  FROM public.audit_logs a
  JOIN public.leads l
    ON l.id::text = a.entidade_id
   AND l.empresa_id = p_empresa_id
  WHERE a.empresa_id = p_empresa_id
    AND a.entidade = 'leads'
    AND a.modulo = 'leads'
    AND a.event_type = 'create'
    AND a.status = 'success'
    AND a.metadata ->> 'importProviderLeadId' = p_provider_lead_id::text
  ORDER BY a.created_at DESC
  LIMIT 1;

  IF existing_crm_lead_id IS NOT NULL THEN
    UPDATE public.empresa_provider_listings
    SET imported = true,
        import_status = 'imported',
        crm_lead_id = existing_crm_lead_id,
        imported_at = COALESCE(imported_at, now()),
        imported_by = actor_id,
        import_error = NULL,
        updated_at = now()
    WHERE empresa_id = p_empresa_id
      AND provider_lead_id = p_provider_lead_id;

    RETURN jsonb_build_object(
      'status', 'already_imported',
      'crm_lead_id', existing_crm_lead_id,
      'reconciled', true
    );
  END IF;

  -- Verificar e bloquear o registo global antes de reservar a importacao.
  SELECT pl.provider_active
  INTO global_provider_active
  FROM public.provider_leads pl
  WHERE pl.id = p_provider_lead_id
  FOR UPDATE;

  IF NOT FOUND OR global_provider_active IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('status', 'unavailable');
  END IF;

  -- Respeitar tambem a decisao manual especifica da empresa.
  IF current_listing.is_active IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('status', 'unavailable');
  END IF;

  UPDATE public.empresa_provider_listings
  SET import_status = 'importing',
      import_started_at = now(),
      import_error = NULL,
      imported_by = actor_id,
      updated_at = now()
  WHERE empresa_id = p_empresa_id
    AND provider_lead_id = p_provider_lead_id
    AND imported = false
    AND (
      import_status IN ('pending', 'failed')
      OR (
        import_status = 'importing'
        AND import_started_at < now() - interval '15 minutes'
      )
    )
  RETURNING * INTO current_listing;

  IF FOUND THEN
    RETURN jsonb_build_object('status', 'claimed');
  END IF;

  SELECT * INTO current_listing
  FROM public.empresa_provider_listings
  WHERE empresa_id = p_empresa_id
    AND provider_lead_id = p_provider_lead_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'listing_not_found');
  END IF;

  IF current_listing.imported OR current_listing.import_status = 'imported' THEN
    RETURN jsonb_build_object(
      'status', 'already_imported',
      'crm_lead_id', current_listing.crm_lead_id
    );
  END IF;

  IF current_listing.import_status = 'importing' THEN
    RETURN jsonb_build_object('status', 'processing');
  END IF;

  RETURN jsonb_build_object('status', 'unavailable');
END;
$$;

REVOKE ALL ON FUNCTION public.radar_claim_lead_import(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.radar_claim_lead_import(UUID, UUID, UUID) TO authenticated;

COMMIT;