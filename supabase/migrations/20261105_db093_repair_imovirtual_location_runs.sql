BEGIN;

-- Tabela de controlo de execuções da reparação de localização Imovirtual
CREATE TABLE IF NOT EXISTS public.repair_imovirtual_location_runs (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status              text        NOT NULL DEFAULT 'running',
  started_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,
  last_processed_id   uuid,
  batch_size          integer     NOT NULL DEFAULT 50,
  fetched_count       integer     NOT NULL DEFAULT 0,
  updated_count       integer     NOT NULL DEFAULT 0,
  partial_count       integer     NOT NULL DEFAULT 0,
  not_found_count     integer     NOT NULL DEFAULT 0,
  http_error_count    integer     NOT NULL DEFAULT 0,
  extraction_error_count integer  NOT NULL DEFAULT 0,
  location_error_count integer    NOT NULL DEFAULT 0,
  update_error_count  integer     NOT NULL DEFAULT 0,
  error_details       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  lease_owner         text,
  heartbeat_at        timestamptz,
  lease_expires_at    timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT repair_imovirtual_location_runs_status_check
    CHECK (status IN ('running', 'completed', 'failed', 'no_more_records')),
  CONSTRAINT repair_imovirtual_location_runs_counts_check
    CHECK (fetched_count >= 0 AND updated_count >= 0 AND partial_count >= 0 AND not_found_count >= 0
       AND http_error_count >= 0 AND extraction_error_count >= 0 AND location_error_count >= 0 AND update_error_count >= 0)
);

-- Índice para garantir apenas uma execução ativa
CREATE UNIQUE INDEX IF NOT EXISTS idx_repair_imovirtual_location_runs_running
  ON public.repair_imovirtual_location_runs (status)
  WHERE status = 'running';

-- Índice para histórico
CREATE INDEX IF NOT EXISTS idx_repair_imovirtual_location_runs_history
  ON public.repair_imovirtual_location_runs (started_at DESC);

-- Índice para cursor de progressão
CREATE INDEX IF NOT EXISTS idx_repair_imovirtual_location_runs_cursor
  ON public.repair_imovirtual_location_runs (last_processed_id)
  WHERE status = 'completed';

ALTER TABLE public.repair_imovirtual_location_runs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.repair_imovirtual_location_runs IS
  'Controlo de execuções agendadas da reparação de localização de anúncios Imovirtual.';

-- Função para reclamar uma execução (com lease)
CREATE OR REPLACE FUNCTION public.claim_repair_imovirtual_location_run(
  p_owner text,
  p_now timestamptz,
  p_lease_until timestamptz,
  p_batch_size integer DEFAULT 50
)
RETURNS TABLE (run_id uuid, last_processed_id uuid, recovered boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_run public.repair_imovirtual_location_runs%ROWTYPE;
  last_completed_cursor uuid;
  was_recovered boolean := false;
BEGIN
  IF nullif(trim(p_owner), '') IS NULL THEN
    RAISE EXCEPTION 'owner is required';
  END IF;

  IF p_batch_size IS NULL OR p_batch_size <= 0 THEN
    RAISE EXCEPTION 'batch_size must be greater than zero';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('repair_imovirtual_location', 0));

  -- Verificar se há execução ativa com lease válido
  SELECT * INTO current_run
  FROM public.repair_imovirtual_location_runs
  WHERE status = 'running'
  FOR UPDATE;

  IF current_run.id IS NOT NULL
     AND coalesce(current_run.lease_expires_at, current_run.started_at + interval '20 minutes') > p_now THEN
    RETURN;
  END IF;

  -- Marcar execução anterior como falhada se lease expirou
  IF current_run.id IS NOT NULL THEN
    was_recovered := true;
    UPDATE public.repair_imovirtual_location_runs
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

  -- Se a última execução terminou sem mais registos, não iniciar novos batches.
  IF EXISTS (
    SELECT 1
    FROM public.repair_imovirtual_location_runs r
    WHERE r.status = 'no_more_records'
    ORDER BY r.completed_at DESC
    LIMIT 1
  ) THEN
    RETURN;
  END IF;

  -- Obter cursor da última execução completada
  SELECT r.last_processed_id INTO last_completed_cursor
  FROM public.repair_imovirtual_location_runs r
  WHERE r.status = 'completed'
  ORDER BY r.completed_at DESC
  LIMIT 1;

  -- Criar nova execução
  INSERT INTO public.repair_imovirtual_location_runs (
    status, started_at, updated_at,
    last_processed_id, batch_size,
    lease_owner, heartbeat_at, lease_expires_at
  )
  VALUES ('running', p_now, p_now, last_completed_cursor, p_batch_size, p_owner, p_now, p_lease_until)
  RETURNING id INTO run_id;

  last_processed_id := last_completed_cursor;
  recovered := was_recovered;
  RETURN NEXT;
END;
$$;

-- Função para heartbeat
CREATE OR REPLACE FUNCTION public.heartbeat_repair_imovirtual_location_run(
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
  UPDATE public.repair_imovirtual_location_runs
  SET heartbeat_at = p_now, lease_expires_at = p_lease_until, updated_at = p_now
  WHERE id = p_run_id AND status = 'running' AND lease_owner = p_owner;
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed > 0;
END;
$$;

-- Função para finalizar execução
CREATE OR REPLACE FUNCTION public.finish_repair_imovirtual_location_run(
  p_run_id uuid,
  p_owner text,
  p_status text,
  p_completed_at timestamptz,
  p_last_processed_id uuid,
  p_fetched_count integer,
  p_updated_count integer,
  p_partial_count integer,
  p_not_found_count integer,
  p_http_error_count integer,
  p_extraction_error_count integer,
  p_location_error_count integer,
  p_update_error_count integer,
  p_error_details jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed integer;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('completed', 'failed', 'no_more_records') THEN
    RAISE EXCEPTION 'invalid final status: %', p_status;
  END IF;

  UPDATE public.repair_imovirtual_location_runs
  SET status = p_status,
      completed_at = p_completed_at,
      last_processed_id = p_last_processed_id,
      fetched_count = p_fetched_count,
      updated_count = p_updated_count,
      partial_count = p_partial_count,
      not_found_count = p_not_found_count,
      http_error_count = p_http_error_count,
      extraction_error_count = p_extraction_error_count,
      location_error_count = p_location_error_count,
      update_error_count = p_update_error_count,
      error_details = coalesce(p_error_details, '[]'::jsonb),
      updated_at = p_completed_at,
      lease_owner = NULL,
      heartbeat_at = NULL,
      lease_expires_at = NULL
  WHERE id = p_run_id AND status = 'running' AND lease_owner = p_owner;
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed > 0;
END;
$$;

-- Permissões: apenas service_role
REVOKE EXECUTE ON FUNCTION public.claim_repair_imovirtual_location_run(text, timestamptz, timestamptz, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.heartbeat_repair_imovirtual_location_run(uuid, text, timestamptz, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finish_repair_imovirtual_location_run(uuid, text, text, timestamptz, uuid, integer, integer, integer, integer, integer, integer, integer, integer, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_repair_imovirtual_location_run(text, timestamptz, timestamptz, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_repair_imovirtual_location_run(uuid, text, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_repair_imovirtual_location_run(uuid, text, text, timestamptz, uuid, integer, integer, integer, integer, integer, integer, integer, integer, jsonb) TO service_role;

-- ============================================================================
-- AGENDAMENTO CRON (DESATIVADO - requer ativação manual)
-- ============================================================================
-- Para ativar o agendamento, executar manualmente:
--
-- 1. Armazenar secrets no Vault:
--    SELECT vault.create_secret('https://vtymfigjtczgeyavdujl.supabase.co', 'project_url');
--    Criar o segredo service_role_key no Vault através do Dashboard/SQL Editor,
--    sem inserir a chave neste ficheiro nem no controlo de versões.
--
-- 2. Criar o agendamento:
--    SELECT cron.schedule(
--      'repair-imovirtual-location-scheduler',
--      '*/15 * * * *', -- a cada 15 minutos
--      $$
--      SELECT net.http_post(
--        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/repair-imovirtual-location-scheduler',
--        headers := jsonb_build_object(
--          'Content-Type', 'application/json',
--          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
--        ),
--        body := '{}'::jsonb
--      ) AS request_id;
--      $$
--    );
--
-- 3. Verificar agendamentos ativos:
--    SELECT * FROM cron.job;
--
-- 4. Para desativar:
--    SELECT cron.unschedule('repair-imovirtual-location-scheduler');
-- ============================================================================

COMMIT;
