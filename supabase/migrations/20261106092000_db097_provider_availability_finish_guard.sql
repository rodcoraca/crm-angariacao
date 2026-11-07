-- DB-097: impedir finalizacao por execucoes com lease expirado.

BEGIN;

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
  current_run public.provider_availability_runs%ROWTYPE;
  changed integer;
BEGIN
  -- Obter o bloqueio antes de validar a propriedade do lease.
  SELECT *
  INTO current_run
  FROM public.provider_availability_runs
  WHERE id = p_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- A execucao so pode ser finalizada pelo proprietario
  -- enquanto o lease continuar valido.
  IF current_run.status <> 'running'
     OR current_run.lease_owner IS DISTINCT FROM p_owner
     OR COALESCE(
       current_run.lease_expires_at,
       current_run.started_at + interval '30 minutes'
     ) <= clock_timestamp()
  THEN
    RETURN false;
  END IF;

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
  WHERE id = p_run_id
    AND status = 'running'
    AND lease_owner = p_owner;

  GET DIAGNOSTICS changed = ROW_COUNT;

  RETURN changed > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.finish_provider_availability_run(uuid, text, text, timestamptz, integer, integer, integer, integer, integer, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finish_provider_availability_run(uuid, text, text, timestamptz, integer, integer, integer, integer, integer, jsonb, integer) TO service_role;

COMMIT;