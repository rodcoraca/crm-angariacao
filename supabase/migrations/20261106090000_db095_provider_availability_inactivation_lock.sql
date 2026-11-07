-- DB-095: serializar a inativacao de anuncios com a propriedade do lease.
-- A validade do lease e verificada depois de obter o bloqueio da execucao.

BEGIN;

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
DECLARE
  current_run public.provider_availability_runs%ROWTYPE;
BEGIN
  -- Serializar a inativacao com recuperacao, heartbeat e finalizacao.
  SELECT *
  INTO current_run
  FROM public.provider_availability_runs
  WHERE id = p_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Verificar propriedade e validade usando o relogio real,
  -- depois de obter o bloqueio.
  IF current_run.status <> 'running'
     OR current_run.lease_owner IS DISTINCT FROM p_owner
     OR COALESCE(
          current_run.lease_expires_at,
          current_run.started_at + interval '30 minutes'
        ) <= clock_timestamp()
  THEN
    RETURN false;
  END IF;

  UPDATE public.provider_leads
  SET provider_active = false
  WHERE id = p_lead_id
    AND provider_active = true;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.inactivate_provider_lead_if_run_owner(uuid, text, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inactivate_provider_lead_if_run_owner(uuid, text, uuid, timestamptz) TO service_role;

COMMIT;