-- DB-096: impedir a renovacao de leases expirados.

BEGIN;

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
  SET
    heartbeat_at = p_now,
    lease_expires_at = p_lease_until,
    updated_at = p_now
  WHERE id = p_run_id
    AND status = 'running'
    AND lease_owner = p_owner
    AND COALESCE(
      lease_expires_at,
      started_at + interval '30 minutes'
    ) > clock_timestamp()
    AND p_lease_until > clock_timestamp();

  GET DIAGNOSTICS changed = ROW_COUNT;

  RETURN changed > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.heartbeat_provider_availability_run(uuid, text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.heartbeat_provider_availability_run(uuid, text, timestamptz, timestamptz) TO service_role;

COMMIT;