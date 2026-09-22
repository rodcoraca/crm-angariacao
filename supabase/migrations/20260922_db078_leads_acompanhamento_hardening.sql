-- DB-078: hardening de RBAC, autoria e integridade do Acompanhamento.
-- Mantem as migrations historicas e as RLS existentes sem as enfraquecer.

BEGIN;

INSERT INTO public.permissions (module, action, code, description, is_active)
VALUES (
  'leads.acompanhamento',
  'view',
  'leads.acompanhamento.view',
  'Permite visualizar o acompanhamento de Leads.',
  true
)
ON CONFLICT (code) DO UPDATE
SET module = EXCLUDED.module,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM public.roles r
  JOIN public.permissions p ON p.code = 'leads.acompanhamento.view'
  WHERE upper(r.code) = 'ADMIN'
  ON CONFLICT DO NOTHING;

  ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "allow select" ON public.leads;
  DROP POLICY IF EXISTS "Agents see own leads" ON public.leads;
  DROP POLICY IF EXISTS "update own leads" ON public.leads;

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
BEGIN
  SELECT u.id INTO actor_id
  FROM public.usuarios u
  WHERE u.auth_user_id = auth.uid()
    AND u.empresa_id = p_empresa_id
    AND u.ativo = true;

  IF actor_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'unauthorized');
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
      OR (import_status = 'importing' AND import_started_at < now() - interval '15 minutes')
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
    RETURN jsonb_build_object('status', 'already_imported');
  END IF;
  IF current_listing.import_status = 'importing' THEN
    RETURN jsonb_build_object('status', 'processing');
  END IF;
  RETURN jsonb_build_object('status', 'unavailable');
END;
$$;

CREATE OR REPLACE FUNCTION public.radar_complete_lead_import(
  p_empresa_id UUID,
  p_provider_lead_id UUID,
  p_crm_lead_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID;
BEGIN
  SELECT u.id INTO actor_id
  FROM public.usuarios u
  WHERE u.auth_user_id = auth.uid()
    AND u.empresa_id = p_empresa_id
    AND u.ativo = true;

  IF actor_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'unauthorized');
  END IF;

  UPDATE public.empresa_provider_listings
  SET imported = true,
      import_status = 'imported',
      crm_lead_id = p_crm_lead_id,
      imported_at = now(),
      imported_by = actor_id,
      import_error = NULL,
      updated_at = now()
  WHERE empresa_id = p_empresa_id
    AND provider_lead_id = p_provider_lead_id
    AND import_status = 'importing'
    AND EXISTS (
      SELECT 1
      FROM public.leads l
      WHERE l.id = p_crm_lead_id
        AND l.empresa_id = p_empresa_id
    );

  IF FOUND THEN
    RETURN jsonb_build_object('status', 'completed');
  END IF;
  RETURN jsonb_build_object('status', 'not_claimed');
END;
$$;

REVOKE ALL ON FUNCTION public.radar_claim_lead_import(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.radar_complete_lead_import(UUID, UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.radar_claim_lead_import(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.radar_complete_lead_import(UUID, UUID, UUID, UUID) TO authenticated;

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
SECURITY DEFINER
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
        OR COALESCE((u.permissoes ->> 'leads.acompanhamento.view')::boolean, false)
        OR EXISTS (
          SELECT 1
          FROM public.user_roles ur
          JOIN public.role_permissions rp ON rp.role_id = ur.role_id
          JOIN public.permissions permission ON permission.id = rp.permission_id
          WHERE ur.user_id = u.auth_user_id
            AND (ur.empresa_id IS NULL OR ur.empresa_id = p_empresa_id)
            AND permission.code = 'leads.acompanhamento.view'
            AND permission.is_active = true
        )
      )
  ) AS value
),
audit_events AS (
  SELECT
    a.id,
    a.created_at,
    CASE WHEN a.entidade_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN a.entidade_id::uuid END AS lead_id,
    a.user_id AS actor_id,
    CASE
      WHEN u.id IS NOT NULL THEN NULLIF(trim(concat_ws(' ', u.nome, u.apelido)), '')
      WHEN a.user_id IS NULL THEN 'Sistema'
      ELSE 'Utilizador não identificado'
    END AS actor_name,
    a.metadata,
    CASE
      WHEN a.modulo = 'lead_lembretes' AND a.metadata ->> 'action' = 'criar_lembrete' THEN 'Lembrete criado'
      WHEN a.modulo = 'lead_lembretes' AND a.metadata ->> 'action' = 'alterar_lembrete' THEN 'Lembrete alterado'
      WHEN a.modulo = 'lead_lembretes' AND a.metadata ->> 'action' = 'concluir_lembrete' THEN 'Lembrete concluído'
      WHEN a.metadata ->> 'action' = 'transferir_responsavel_lead' THEN 'Atribuição'
      WHEN a.metadata ->> 'action' = 'alterar_tipo_lead' THEN 'Alteração de tipo'
      WHEN a.metadata ->> 'action' = 'editar_lead'
        AND COALESCE((a.metadata ->> 'statusChanged')::boolean, false) THEN 'Alteração de status'
      WHEN a.metadata ->> 'action' = 'criar_lead'
        AND a.metadata ->> 'importProviderLeadId' IS NOT NULL THEN 'Importação'
      WHEN a.metadata ->> 'action' = 'criar_lead' THEN 'Criação'
      ELSE 'Operação'
    END AS activity_type,
    COALESCE(a.metadata ->> 'action', a.event_type) AS action,
    a.metadata #>> '{before,status}' AS previous_status,
    a.metadata #>> '{after,status}' AS new_status,
    a.metadata ->> 'importProviderLeadId' AS import_provider_lead_id
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
    epl.imported_by::text AS actor_id,
    COALESCE(NULLIF(trim(concat_ws(' ', u.nome, u.apelido)), ''), 'Utilizador não identificado') AS actor_name,
    '{}'::jsonb AS metadata,
    'Importação'::text AS activity_type,
    'importar_lead_radar'::text AS action,
    NULL::text AS previous_status,
    NULL::text AS new_status,
    epl.provider_lead_id::text AS import_provider_lead_id
  FROM public.empresa_provider_listings epl
  LEFT JOIN public.usuarios u ON u.id = epl.imported_by AND u.empresa_id = p_empresa_id
  WHERE epl.empresa_id = p_empresa_id
    AND epl.imported = true
    AND epl.imported_at >= p_date_from
    AND epl.imported_at < p_date_to
    AND NOT EXISTS (
      SELECT 1
      FROM audit_events ae
      WHERE ae.activity_type = 'Importação'
        AND ae.import_provider_lead_id = epl.provider_lead_id::text
    )
),
events AS (
  SELECT id, created_at, lead_id, actor_id, actor_name, metadata, activity_type, action, previous_status, new_status
  FROM audit_events
  UNION ALL
  SELECT id, created_at, lead_id, actor_id, actor_name, metadata, activity_type, action, previous_status, new_status
  FROM provider_imports
),
enriched AS (
  SELECT
    e.*,
    l.nome AS lead_name,
    l.origem,
    l.status AS current_status,
    CASE
      WHEN e.activity_type = 'Alteração de status' THEN e.new_status
      ELSE l.status
    END AS event_status
  FROM events e
  LEFT JOIN public.leads l ON l.id = e.lead_id AND l.empresa_id = p_empresa_id
  WHERE (p_user_id IS NULL OR e.actor_id = p_user_id::text)
    AND (NULLIF(trim(p_origin), '') IS NULL OR lower(COALESCE(l.origem, '')) = lower(trim(p_origin)))
    AND (
      NULLIF(trim(p_status), '') IS NULL
      OR (CASE WHEN e.activity_type = 'Alteração de status' THEN e.new_status ELSE l.status END) = trim(p_status)
    )
    AND (NULLIF(trim(p_activity), '') IS NULL OR e.activity_type = trim(p_activity))
),
counts AS (
  SELECT
    NULL::bigint AS accompanied,
    count(*) FILTER (WHERE activity_type = 'Importação') AS imported,
    count(*) FILTER (WHERE activity_type IN ('Criação', 'Alteração de tipo', 'Atribuição', 'Operação')) AS operated,
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
      count(*) FILTER (WHERE activity_type IN ('Criação', 'Alteração de tipo', 'Atribuição', 'Operação')) AS operated,
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
    SELECT id, created_at, lead_id, lead_name, activity_type, action,
      previous_status, new_status, actor_id, actor_name, origem, current_status,
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
    AND (
      (public.is_admin() AND empresa_id = p_empresa_id)
      OR criado_por = public.current_user_profile_id()
    )
    AND criado_at < p_date_to
    AND (
      p_user_id IS NULL
      OR p_user_id = public.current_user_profile_id()
      OR (public.is_admin() AND criado_por = p_user_id)
    )
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
