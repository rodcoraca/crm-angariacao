-- DB-077: consulta tenant-scoped para Acompanhamento de Leads.
-- Reutiliza audit_logs, lead_lembretes e empresa_provider_listings.

BEGIN;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_select_policy ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;

CREATE POLICY audit_logs_select_policy
ON public.audit_logs
FOR SELECT TO authenticated
USING (empresa_id = public.current_empresa_id());

CREATE POLICY audit_logs_insert_policy
ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.current_empresa_id());

CREATE INDEX IF NOT EXISTS idx_audit_logs_leads_activity
  ON public.audit_logs (empresa_id, created_at DESC, user_id)
  WHERE modulo IN ('leads', 'lead_lembretes');

CREATE OR REPLACE FUNCTION public.leads_acompanhamento(
  p_empresa_id UUID,
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ,
  p_user_id UUID DEFAULT NULL,
  p_origin TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_activity TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 25
)
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = public
AS $$
WITH params AS (
  SELECT
    p_empresa_id AS empresa_id,
    p_date_from AS date_from,
    p_date_to AS date_to,
    GREATEST(1, p_page) AS page,
    LEAST(100, GREATEST(1, p_page_size)) AS page_size
),
allowed AS (
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.auth_user_id = auth.uid()
      AND u.empresa_id = p_empresa_id
      AND u.ativo = true
      AND (
        public.is_admin()
        OR COALESCE((u.permissoes ->> 'logs.view')::boolean, false)
        OR EXISTS (
          SELECT 1
          FROM public.user_roles ur
          JOIN public.role_permissions rp ON rp.role_id = ur.role_id
          JOIN public.permissions permission ON permission.id = rp.permission_id
          WHERE ur.user_id = u.auth_user_id
            AND ur.empresa_id = p_empresa_id
            AND permission.code = 'logs.view'
        )
      )
  ) AS value
),
audit_events AS (
  SELECT
    a.id,
    a.created_at,
    a.entidade_id::uuid AS lead_id,
    COALESCE(u.id, a.user_id::uuid) AS actor_id,
    COALESCE(NULLIF(trim(concat_ws(' ', u.nome, u.apelido)), ''), 'Sistema') AS actor_name,
    a.metadata,
    CASE
      WHEN a.modulo = 'lead_lembretes' AND a.metadata ->> 'action' = 'criar_lembrete' THEN 'Lembrete criado'
      WHEN a.modulo = 'lead_lembretes' AND a.metadata ->> 'action' = 'alterar_lembrete' THEN 'Lembrete alterado'
      WHEN a.modulo = 'lead_lembretes' AND a.metadata ->> 'action' = 'concluir_lembrete' THEN 'Lembrete concluído'
      WHEN a.metadata ->> 'action' = 'transferir_responsavel_lead' THEN 'Atribuição'
      WHEN a.metadata ->> 'action' = 'editar_lead' AND (a.metadata ->> 'statusChanged')::boolean IS TRUE THEN 'Alteração de status'
      WHEN a.metadata ->> 'action' = 'alterar_estado_lead' THEN 'Alteração de status'
      WHEN a.metadata ->> 'action' = 'criar_lead' AND lower(COALESCE(a.metadata #>> '{payload,origem}', '')) LIKE '%radar%' THEN 'Importação'
      ELSE 'Operação'
    END AS activity_type,
    COALESCE(a.metadata ->> 'action', a.event_type) AS action,
    a.metadata #>> '{before,status}' AS previous_status,
    a.metadata #>> '{after,status}' AS new_status
  FROM public.audit_logs a
  LEFT JOIN public.usuarios u
    ON u.empresa_id = p_empresa_id
   AND (u.id::text = a.user_id::text OR u.auth_user_id::text = a.user_id::text)
  WHERE a.empresa_id = p_empresa_id
    AND a.created_at >= p_date_from
    AND a.created_at < p_date_to
    AND a.modulo IN ('leads', 'lead_lembretes')
),
provider_imports AS (
  SELECT
    epl.id,
    epl.imported_at AS created_at,
    epl.crm_lead_id AS lead_id,
    epl.imported_by AS actor_id,
    COALESCE(NULLIF(trim(concat_ws(' ', u.nome, u.apelido)), ''), 'Sistema') AS actor_name,
    '{}'::jsonb AS metadata,
    'Importação'::text AS activity_type,
    'importar_lead_radar'::text AS action,
    NULL::text AS previous_status,
    NULL::text AS new_status
  FROM public.empresa_provider_listings epl
  LEFT JOIN public.usuarios u ON u.id = epl.imported_by AND u.empresa_id = p_empresa_id
  WHERE epl.empresa_id = p_empresa_id
    AND epl.imported = true
    AND epl.imported_at >= p_date_from
    AND epl.imported_at < p_date_to
    AND NOT EXISTS (
      SELECT 1 FROM audit_events ae
      WHERE ae.lead_id = epl.crm_lead_id
        AND ae.activity_type = 'Importação'
    )
),
events AS (
  SELECT * FROM audit_events
  UNION ALL
  SELECT * FROM provider_imports
),
enriched AS (
  SELECT
    e.*,
    l.nome AS lead_name,
    l.origem,
    l.status AS current_status
  FROM events e
  LEFT JOIN public.leads l ON l.id = e.lead_id AND l.empresa_id = p_empresa_id
  WHERE (p_user_id IS NULL OR e.actor_id = p_user_id)
    AND (NULLIF(trim(p_origin), '') IS NULL OR lower(COALESCE(l.origem, '')) = lower(trim(p_origin)))
    AND (NULLIF(trim(p_status), '') IS NULL OR l.status = trim(p_status))
    AND (NULLIF(trim(p_activity), '') IS NULL OR e.activity_type = trim(p_activity))
),
counts AS (
  SELECT
    NULL::bigint AS accompanied,
    count(*) FILTER (WHERE activity_type = 'Importação') AS imported,
    count(*) FILTER (WHERE activity_type NOT IN ('Importação', 'Alteração de status', 'Lembrete criado', 'Lembrete alterado', 'Lembrete concluído')) AS operated,
    count(*) FILTER (WHERE activity_type = 'Alteração de status') AS status_changed,
    count(*) FILTER (WHERE activity_type LIKE 'Lembrete%') AS reminder_events,
    count(*) FILTER (WHERE activity_type = 'Lembrete criado') AS reminders_created,
    count(*) FILTER (WHERE activity_type = 'Lembrete concluído') AS reminders_completed,
    count(*) AS total
  FROM enriched
),
user_rows AS (
  SELECT jsonb_agg(to_jsonb(row) ORDER BY row.user_name) AS value
  FROM (
    SELECT
      actor_id AS user_id,
      actor_name AS user_name,
      NULL::bigint AS accompanied,
      count(*) FILTER (WHERE activity_type = 'Importação') AS imported,
      count(*) FILTER (WHERE activity_type NOT IN ('Importação', 'Alteração de status') AND activity_type NOT LIKE 'Lembrete%') AS operated,
      count(*) FILTER (WHERE activity_type = 'Alteração de status') AS status_changed,
      count(*) FILTER (WHERE activity_type = 'Lembrete criado') AS reminders_created,
      count(*) FILTER (WHERE activity_type = 'Lembrete concluído') AS reminders_completed
    FROM enriched
    GROUP BY actor_id, actor_name
  ) row
),
activity_rows AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(row) ORDER BY row.created_at DESC), '[]'::jsonb) AS value
  FROM (
    SELECT
      id,
      created_at,
      lead_id,
      lead_name,
      activity_type,
      action,
      previous_status,
      new_status,
      actor_id,
      actor_name,
      origem,
      current_status,
      metadata AS details
    FROM enriched
    ORDER BY created_at DESC
    OFFSET ((SELECT page FROM params) - 1) * (SELECT page_size FROM params)
    LIMIT (SELECT page_size FROM params)
  ) row
),
reminder_state AS (
  SELECT
    count(*) FILTER (WHERE estado = 'ativo' AND (data_lembrete + COALESCE(hora_lembrete, '23:59:59'::time)) >= CURRENT_TIMESTAMP) AS pending,
    count(*) FILTER (WHERE estado = 'ativo' AND (data_lembrete + COALESCE(hora_lembrete, '23:59:59'::time)) < CURRENT_TIMESTAMP) AS overdue
  FROM public.lead_lembretes
  WHERE empresa_id = p_empresa_id
    AND criado_at < p_date_to
    AND (p_user_id IS NULL OR criado_por = p_user_id)
)
SELECT CASE WHEN NOT (SELECT value FROM allowed) THEN
  jsonb_build_object('error', 'forbidden')
ELSE
  jsonb_build_object(
    'kpis', (SELECT to_jsonb(counts) FROM counts),
    'reminder_state', (SELECT to_jsonb(reminder_state) FROM reminder_state),
    'users', COALESCE((SELECT value FROM user_rows), '[]'::jsonb),
    'activities', (SELECT value FROM activity_rows)
  )
END;
$$;

REVOKE ALL ON FUNCTION public.leads_acompanhamento(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leads_acompanhamento(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

COMMIT;