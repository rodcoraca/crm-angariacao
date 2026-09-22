-- DB-079: agregacoes globais do Acompanhamento sem depender da paginação da timeline.

BEGIN;

CREATE OR REPLACE FUNCTION public.leads_acompanhamento_global_kpis(
  p_empresa_id UUID,
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ,
  p_origin TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH allowed AS (
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
audit_activity AS (
  SELECT DISTINCT
    CASE
      WHEN a.entidade_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        THEN a.entidade_id::uuid
    END AS lead_id
  FROM public.audit_logs a
  WHERE a.empresa_id = p_empresa_id
    AND a.created_at >= p_date_from
    AND a.created_at < p_date_to
    AND a.modulo IN ('leads', 'lead_lembretes')
),
provider_activity AS (
  SELECT DISTINCT epl.crm_lead_id AS lead_id
  FROM public.empresa_provider_listings epl
  WHERE epl.empresa_id = p_empresa_id
    AND epl.imported = true
    AND epl.crm_lead_id IS NOT NULL
    AND epl.imported_at >= p_date_from
    AND epl.imported_at < p_date_to
),
activity_leads AS (
  SELECT lead_id FROM audit_activity WHERE lead_id IS NOT NULL
  UNION
  SELECT lead_id FROM provider_activity
),
filtered_leads AS (
  SELECT l.id, l.status
  FROM activity_leads activity
  JOIN public.leads l ON l.id = activity.lead_id
  WHERE l.empresa_id = p_empresa_id
    AND (NULLIF(trim(p_origin), '') IS NULL OR lower(COALESCE(l.origem, '')) = lower(trim(p_origin)))
    AND (NULLIF(trim(p_status), '') IS NULL OR l.status = trim(p_status))
),
lead_counts AS (
  SELECT
    COALESCE(sum(status_count), 0)::bigint AS total,
    COALESCE(sum(status_count) FILTER (WHERE status = 'novo'), 0)::bigint AS new_count,
    COALESCE(sum(status_count) FILTER (WHERE status <> 'novo'), 0)::bigint AS accompanied,
    COALESCE(jsonb_object_agg(status, status_count), '{}'::jsonb) AS status_counts
  FROM (
    SELECT status, count(*)::bigint AS status_count
    FROM filtered_leads
    GROUP BY status
  ) grouped
),
import_rows AS (
  SELECT DISTINCT epl.imported_by, epl.crm_lead_id
  FROM public.empresa_provider_listings epl
  JOIN public.leads l ON l.id = epl.crm_lead_id AND l.empresa_id = p_empresa_id
  WHERE epl.empresa_id = p_empresa_id
    AND epl.imported = true
    AND epl.crm_lead_id IS NOT NULL
    AND epl.imported_at >= p_date_from
    AND epl.imported_at < p_date_to
    AND (NULLIF(trim(p_origin), '') IS NULL OR lower(COALESCE(l.origem, '')) = lower(trim(p_origin)))
    AND (NULLIF(trim(p_status), '') IS NULL OR l.status = trim(p_status))
),
import_counts AS (
  SELECT count(*)::bigint AS imported
  FROM import_rows
),
import_anomalies AS (
  SELECT count(*)::bigint AS imported_unlinked
  FROM public.empresa_provider_listings epl
  WHERE epl.empresa_id = p_empresa_id
    AND epl.imported = true
    AND epl.crm_lead_id IS NULL
    AND epl.imported_at >= p_date_from
    AND epl.imported_at < p_date_to
),
imports_by_user AS (
  SELECT
    COALESCE(u.id::text, ir.imported_by::text, 'system') AS user_id,
    CASE
      WHEN u.id IS NOT NULL THEN NULLIF(trim(concat_ws(' ', u.nome, u.apelido)), '')
      WHEN ir.imported_by IS NULL THEN 'Sistema'
      ELSE 'Utilizador não identificado'
    END AS user_name,
    count(*)::bigint AS imported
  FROM import_rows ir
  LEFT JOIN public.usuarios u ON u.id = ir.imported_by AND u.empresa_id = p_empresa_id
  GROUP BY COALESCE(u.id::text, ir.imported_by::text, 'system'),
    CASE
      WHEN u.id IS NOT NULL THEN NULLIF(trim(concat_ws(' ', u.nome, u.apelido)), '')
      WHEN ir.imported_by IS NULL THEN 'Sistema'
      ELSE 'Utilizador não identificado'
    END
),
activity_users AS (
  SELECT
    COALESCE(u.id::text, CASE WHEN a.user_id IS NULL THEN 'system' ELSE a.user_id END) AS user_id,
    CASE
      WHEN u.id IS NOT NULL THEN NULLIF(trim(concat_ws(' ', u.nome, u.apelido)), '')
      WHEN a.user_id IS NULL THEN 'Sistema'
      ELSE 'Utilizador não identificado'
    END AS user_name
  FROM public.audit_logs a
  LEFT JOIN public.usuarios u
    ON u.empresa_id = p_empresa_id
   AND (u.id::text = a.user_id OR u.auth_user_id::text = a.user_id)
  WHERE a.empresa_id = p_empresa_id
    AND a.created_at >= p_date_from
    AND a.created_at < p_date_to
    AND a.modulo IN ('leads', 'lead_lembretes')
  GROUP BY
    COALESCE(u.id::text, CASE WHEN a.user_id IS NULL THEN 'system' ELSE a.user_id END),
    CASE
      WHEN u.id IS NOT NULL THEN NULLIF(trim(concat_ws(' ', u.nome, u.apelido)), '')
      WHEN a.user_id IS NULL THEN 'Sistema'
      ELSE 'Utilizador não identificado'
    END
),
combined_users AS (
  SELECT user_id, max(user_name) AS user_name, max(imported)::bigint AS imported
  FROM (
    SELECT user_id, user_name, imported FROM imports_by_user
    UNION ALL
    SELECT user_id, user_name, 0::bigint AS imported FROM activity_users
  ) source_users
  GROUP BY user_id
),
users AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(row) ORDER BY row.user_name), '[]'::jsonb) AS value
  FROM (
    SELECT user_id, user_name, imported
    FROM combined_users
  ) row
)
SELECT CASE WHEN NOT (SELECT value FROM allowed) THEN
  jsonb_build_object('error', 'forbidden')
ELSE
  jsonb_build_object(
    'kpis', jsonb_build_object(
      'total', (SELECT total FROM lead_counts),
      'new', (SELECT new_count FROM lead_counts),
      'accompanied', (SELECT accompanied FROM lead_counts),
      'status_counts', (SELECT status_counts FROM lead_counts),
      'imported', (SELECT imported FROM import_counts),
      'imported_unlinked', (SELECT imported_unlinked FROM import_anomalies)
    ),
    'users', (SELECT value FROM users)
  )
END;
$$;

REVOKE ALL ON FUNCTION public.leads_acompanhamento_global_kpis(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leads_acompanhamento_global_kpis(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;

-- Carteira por responsavel atual. Mantem a assinatura anterior para compatibilidade.
CREATE OR REPLACE FUNCTION public.leads_acompanhamento_global_kpis(
  p_empresa_id UUID,
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ,
  p_origin TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_agente_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH allowed AS (
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.auth_user_id = auth.uid()
      AND u.empresa_id = p_empresa_id
      AND u.ativo = true
      AND (
        public.is_admin()
        OR COALESCE((u.permissoes ->> 'leads.acompanhamento.view')::boolean, false)
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.role_permissions rp ON rp.role_id = ur.role_id
          JOIN public.permissions permission ON permission.id = rp.permission_id
          WHERE ur.user_id = u.auth_user_id
            AND (ur.empresa_id IS NULL OR ur.empresa_id = p_empresa_id)
            AND permission.code = 'leads.acompanhamento.view'
            AND permission.is_active = true
        )
      )
  ) AS value
), carteira AS (
  SELECT l.id, l.status, l.agente_id
  FROM public.leads l
  WHERE l.empresa_id = p_empresa_id
    AND (p_agente_id IS NULL OR l.agente_id = p_agente_id)
    AND (NULLIF(trim(p_origin), '') IS NULL OR lower(COALESCE(l.origem, '')) = lower(trim(p_origin)))
    AND (NULLIF(trim(p_status), '') IS NULL OR l.status = trim(p_status))
), estados AS (
  SELECT status, count(*)::bigint AS amount FROM carteira GROUP BY status
), import_rows AS (
  SELECT DISTINCT epl.imported_by, epl.crm_lead_id
  FROM public.empresa_provider_listings epl
  JOIN carteira l ON l.id = epl.crm_lead_id
  WHERE epl.empresa_id = p_empresa_id
    AND epl.imported = true
    AND epl.crm_lead_id IS NOT NULL
    AND epl.imported_at >= p_date_from AND epl.imported_at < p_date_to
), importers AS (
  SELECT COALESCE(u.id::text, ir.imported_by::text, 'system') AS user_id,
    CASE WHEN u.id IS NOT NULL THEN NULLIF(trim(concat_ws(' ', u.nome, u.apelido)), '')
      WHEN ir.imported_by IS NULL THEN 'Sistema' ELSE 'Utilizador não identificado' END AS user_name,
    count(*)::bigint AS imported
  FROM import_rows ir
  LEFT JOIN public.usuarios u ON u.id = ir.imported_by AND u.empresa_id = p_empresa_id
  GROUP BY COALESCE(u.id::text, ir.imported_by::text, 'system'),
    CASE WHEN u.id IS NOT NULL THEN NULLIF(trim(concat_ws(' ', u.nome, u.apelido)), '')
      WHEN ir.imported_by IS NULL THEN 'Sistema' ELSE 'Utilizador não identificado' END
), agents AS (
  SELECT COALESCE(u.id::text, 'unassigned') AS user_id,
    CASE WHEN u.id IS NOT NULL THEN NULLIF(trim(concat_ws(' ', u.nome, u.apelido)), '')
      ELSE 'Utilizador não identificado' END AS user_name,
    count(*)::bigint AS portfolio_total,
    count(*) FILTER (WHERE l.status = 'novo')::bigint AS portfolio_new,
    count(*) FILTER (WHERE l.status <> 'novo')::bigint AS portfolio_accompanied
  FROM carteira l
  LEFT JOIN public.usuarios u ON u.id = l.agente_id AND u.empresa_id = p_empresa_id
  GROUP BY COALESCE(u.id::text, 'unassigned'),
    CASE WHEN u.id IS NOT NULL THEN NULLIF(trim(concat_ws(' ', u.nome, u.apelido)), '')
      ELSE 'Utilizador não identificado' END
), anomaly AS (
  SELECT count(*)::bigint AS imported_unlinked
  FROM public.empresa_provider_listings epl
  WHERE epl.empresa_id = p_empresa_id AND epl.imported = true AND epl.crm_lead_id IS NULL
    AND epl.imported_at >= p_date_from AND epl.imported_at < p_date_to
)
SELECT CASE WHEN NOT (SELECT value FROM allowed) THEN jsonb_build_object('error', 'forbidden')
ELSE jsonb_build_object(
  'kpis', jsonb_build_object(
    'total', (SELECT count(*) FROM carteira),
    'new', (SELECT COALESCE(sum(amount) FILTER (WHERE status = 'novo'), 0) FROM estados),
    'accompanied', (SELECT COALESCE(sum(amount) FILTER (WHERE status <> 'novo'), 0) FROM estados),
    'status_counts', (SELECT COALESCE(jsonb_object_agg(status, amount), '{}'::jsonb) FROM estados),
    'imported', (SELECT count(*) FROM import_rows),
    'imported_unlinked', (SELECT imported_unlinked FROM anomaly)
  ),
  'agents', COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.user_name) FROM agents a), '[]'::jsonb),
  'importers', COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.user_name) FROM importers i), '[]'::jsonb)
)
END;
$$;

REVOKE ALL ON FUNCTION public.leads_acompanhamento_global_kpis(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leads_acompanhamento_global_kpis(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) TO authenticated;

-- Timeline filtrada pela carteira do responsavel atual.
CREATE OR REPLACE FUNCTION public.leads_acompanhamento(
  p_empresa_id UUID,
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ,
  p_user_id UUID DEFAULT NULL,
  p_origin TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_activity TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 25,
  p_agente_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH allowed AS (
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.auth_user_id = auth.uid() AND u.empresa_id = p_empresa_id AND u.ativo = true
      AND (public.is_admin() OR COALESCE((u.permissoes ->> 'leads.acompanhamento.view')::boolean, false)
        OR EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.role_permissions rp ON rp.role_id=ur.role_id JOIN public.permissions permission ON permission.id=rp.permission_id WHERE ur.user_id=u.auth_user_id AND (ur.empresa_id IS NULL OR ur.empresa_id=p_empresa_id) AND permission.code='leads.acompanhamento.view' AND permission.is_active=true))
  ) AS value
), events AS (
  SELECT a.id, a.created_at,
    CASE WHEN a.entidade_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN a.entidade_id::uuid END AS lead_id,
    a.user_id::text AS actor_id,
    CASE WHEN u.id IS NOT NULL THEN NULLIF(trim(concat_ws(' ',u.nome,u.apelido)), '') WHEN a.user_id IS NULL THEN 'Sistema' ELSE 'Utilizador não identificado' END AS actor_name,
    a.metadata,
    CASE WHEN a.modulo='lead_lembretes' AND a.metadata->>'action'='criar_lembrete' THEN 'Lembrete criado'
      WHEN a.modulo='lead_lembretes' AND a.metadata->>'action'='alterar_lembrete' THEN 'Lembrete alterado'
      WHEN a.modulo='lead_lembretes' AND a.metadata->>'action' IN ('concluir_lembrete','concluir_lembrete_lead') THEN 'Lembrete concluído'
      WHEN a.metadata->>'action'='transferir_responsavel_lead' THEN 'Atribuição'
      WHEN a.metadata->>'action'='alterar_tipo_lead' THEN 'Alteração de tipo'
      WHEN a.metadata->>'action'='editar_lead' AND COALESCE((a.metadata->>'statusChanged')::boolean,false) THEN 'Alteração de status'
      WHEN a.metadata->>'action'='criar_lead' AND a.metadata->>'importProviderLeadId' IS NOT NULL THEN 'Importação'
      WHEN a.metadata->>'action'='criar_lead' THEN 'Criação' ELSE 'Operação' END AS activity_type,
    COALESCE(a.metadata->>'action',a.event_type) AS action,
    a.metadata #>> '{before,status}' AS previous_status, a.metadata #>> '{after,status}' AS new_status
  FROM public.audit_logs a
  LEFT JOIN public.usuarios u ON u.empresa_id=p_empresa_id AND (u.id::text=a.user_id OR u.auth_user_id::text=a.user_id)
  WHERE a.empresa_id=p_empresa_id AND a.created_at>=p_date_from AND a.created_at<p_date_to AND a.modulo IN ('leads','lead_lembretes')
  UNION ALL
  SELECT epl.id,epl.imported_at,epl.crm_lead_id,epl.imported_by::text,
    COALESCE(NULLIF(trim(concat_ws(' ',u.nome,u.apelido)),''),'Utilizador não identificado'), '{}'::jsonb,
    'Importação','importar_lead_radar',NULL,NULL
  FROM public.empresa_provider_listings epl LEFT JOIN public.usuarios u ON u.id=epl.imported_by AND u.empresa_id=p_empresa_id
  WHERE epl.empresa_id=p_empresa_id AND epl.imported=true AND epl.crm_lead_id IS NOT NULL AND epl.imported_at>=p_date_from AND epl.imported_at<p_date_to
), enriched AS (
  SELECT e.*,l.nome AS lead_name,l.origem,l.status AS current_status,
    CASE WHEN e.activity_type='Alteração de status' THEN e.new_status ELSE l.status END AS event_status
  FROM events e JOIN public.leads l ON l.id=e.lead_id AND l.empresa_id=p_empresa_id
  WHERE (p_agente_id IS NULL OR l.agente_id=p_agente_id)
    AND (p_user_id IS NULL OR e.actor_id=p_user_id::text)
    AND (NULLIF(trim(p_origin),'') IS NULL OR lower(COALESCE(l.origem,''))=lower(trim(p_origin)))
    AND (NULLIF(trim(p_status),'') IS NULL OR (CASE WHEN e.activity_type='Alteração de status' THEN e.new_status ELSE l.status END)=trim(p_status))
    AND (NULLIF(trim(p_activity),'') IS NULL OR e.activity_type=trim(p_activity))
), reminder_state AS (
  SELECT
    count(*) FILTER (WHERE ll.estado='ativo' AND (ll.data_lembrete + COALESCE(ll.hora_lembrete,'23:59:59'::time)) >= CURRENT_TIMESTAMP)::bigint AS pending,
    count(*) FILTER (WHERE ll.estado='ativo' AND (ll.data_lembrete + COALESCE(ll.hora_lembrete,'23:59:59'::time)) < CURRENT_TIMESTAMP)::bigint AS overdue
  FROM public.lead_lembretes ll
  JOIN public.leads l ON l.id=ll.lead_id AND l.empresa_id=p_empresa_id
  WHERE ll.empresa_id=p_empresa_id AND ll.criado_at < p_date_to
    AND (p_agente_id IS NULL OR l.agente_id=p_agente_id)
), activity_rows AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(row) ORDER BY row.created_at DESC),'[]'::jsonb) AS value
  FROM (SELECT id,created_at,lead_id,lead_name,activity_type,action,previous_status,new_status,actor_id,actor_name,origem,current_status,metadata AS details FROM enriched ORDER BY created_at DESC OFFSET ((GREATEST(1,p_page)-1)*LEAST(100,GREATEST(1,p_page_size))) LIMIT LEAST(100,GREATEST(1,p_page_size))) row
), counts AS (
  SELECT count(*)::bigint AS total,
    count(*) FILTER (WHERE activity_type='Importação')::bigint AS imported,
    count(*) FILTER (WHERE activity_type='Alteração de status')::bigint AS status_changed,
    count(*) FILTER (WHERE activity_type LIKE 'Lembrete%')::bigint AS reminder_events,
    count(*) FILTER (WHERE activity_type='Lembrete criado')::bigint AS reminders_created,
    count(*) FILTER (WHERE activity_type='Lembrete concluído')::bigint AS reminders_completed
  FROM enriched
)
SELECT CASE WHEN NOT (SELECT value FROM allowed) THEN jsonb_build_object('error','forbidden') ELSE jsonb_build_object('kpis',(SELECT to_jsonb(counts) FROM counts),'reminder_state',(SELECT to_jsonb(reminder_state) FROM reminder_state),'users','[]'::jsonb,'activities',(SELECT value FROM activity_rows)) END;
$$;

REVOKE ALL ON FUNCTION public.leads_acompanhamento(UUID,TIMESTAMPTZ,TIMESTAMPTZ,UUID,TEXT,TEXT,TEXT,INTEGER,INTEGER,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leads_acompanhamento(UUID,TIMESTAMPTZ,TIMESTAMPTZ,UUID,TEXT,TEXT,TEXT,INTEGER,INTEGER,UUID) TO authenticated;

COMMIT;
