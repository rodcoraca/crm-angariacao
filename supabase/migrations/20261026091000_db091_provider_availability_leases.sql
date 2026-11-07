BEGIN;

ALTER TABLE public.provider_availability_runs
  ADD COLUMN IF NOT EXISTS lease_owner text,
  ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_details_omitted_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.claim_provider_availability_run(
  p_provider text,
  p_owner text,
  p_now timestamptz,
  p_lease_until timestamptz
)
RETURNS TABLE (run_id uuid, recovered boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_run public.provider_availability_runs%ROWTYPE;
  was_recovered boolean := false;
BEGIN
  IF nullif(trim(p_provider), '') IS NULL OR nullif(trim(p_owner), '') IS NULL THEN
    RAISE EXCEPTION 'provider and owner are required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_provider, 0));

  SELECT * INTO current_run
  FROM public.provider_availability_runs
  WHERE provider = p_provider AND status = 'running'
  FOR UPDATE;

  IF current_run.id IS NOT NULL
     AND coalesce(current_run.lease_expires_at, current_run.started_at + interval '30 minutes') > p_now THEN
    RETURN;
  END IF;

  IF current_run.id IS NOT NULL THEN
    was_recovered := true;
    UPDATE public.provider_availability_runs
    SET status = 'failed',
        completed_at = p_now,
        updated_at = p_now,
        error_details = coalesce(error_details, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'code', 'run_recovered_after_lease_expiry',
          'message', 'A execução foi recuperada depois de expirar o lease.'
        )),
        lease_owner = NULL,
        heartbeat_at = NULL,
        lease_expires_at = NULL
    WHERE id = current_run.id;
  END IF;

  INSERT INTO public.provider_availability_runs (
    provider, status, started_at, updated_at,
    lease_owner, heartbeat_at, lease_expires_at
  )
  VALUES (p_provider, 'running', p_now, p_now, p_owner, p_now, p_lease_until)
  RETURNING id INTO run_id;
  recovered := was_recovered;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_provider_availability_run(
  p_run_id uuid,
  p_owner text,
  p_now timestamptz,
  p_lease_until timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed integer;
BEGIN
  UPDATE public.provider_availability_runs
  SET heartbeat_at = p_now, lease_expires_at = p_lease_until, updated_at = p_now
  WHERE id = p_run_id AND status = 'running' AND lease_owner = p_owner;
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.inactivate_provider_lead_if_run_owner(
  p_run_id uuid,
  p_owner text,
  p_lead_id uuid,
  p_now timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.provider_availability_runs
    WHERE id = p_run_id AND status = 'running' AND lease_owner = p_owner
      AND coalesce(lease_expires_at, started_at + interval '30 minutes') > p_now
  ) THEN
    RETURN false;
  END IF;

  UPDATE public.provider_leads
  SET provider_active = false
  WHERE id = p_lead_id AND provider_active = true;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_provider_availability_run(
  p_run_id uuid,
  p_owner text,
  p_status text,
  p_completed_at timestamptz,
  p_checked_count integer,
  p_available_count integer,
  p_inactivated_count integer,
  p_inconclusive_count integer,
  p_error_count integer,
  p_error_details jsonb,
  p_error_details_omitted_count integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed integer;
BEGIN
  UPDATE public.provider_availability_runs
  SET status = p_status,
      completed_at = p_completed_at,
      checked_count = p_checked_count,
      available_count = p_available_count,
      inactivated_count = p_inactivated_count,
      inconclusive_count = p_inconclusive_count,
      error_count = p_error_count,
      error_details = coalesce(p_error_details, '[]'::jsonb),
      error_details_omitted_count = greatest(coalesce(p_error_details_omitted_count, 0), 0),
      updated_at = p_completed_at,
      lease_owner = NULL,
      heartbeat_at = NULL,
      lease_expires_at = NULL
  WHERE id = p_run_id AND status = 'running' AND lease_owner = p_owner;
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_provider_availability_run(text, text, timestamptz, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.heartbeat_provider_availability_run(uuid, text, timestamptz, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.inactivate_provider_lead_if_run_owner(uuid, text, uuid, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finish_provider_availability_run(uuid, text, text, timestamptz, integer, integer, integer, integer, integer, jsonb, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_provider_availability_run(text, text, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_provider_availability_run(uuid, text, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.inactivate_provider_lead_if_run_owner(uuid, text, uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_provider_availability_run(uuid, text, text, timestamptz, integer, integer, integer, integer, integer, jsonb, integer) TO service_role;

COMMIT;
