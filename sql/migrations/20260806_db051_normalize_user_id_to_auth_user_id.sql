-- Normaliza user_id nas três tabelas de atividade para referenciar auth_user_id.
-- Idempotente.

UPDATE user_sessions s
SET user_id = u.auth_user_id::text
FROM usuarios u
WHERE s.user_id = u.id::text
  AND u.auth_user_id IS NOT NULL
  AND s.user_id <> u.auth_user_id::text;

UPDATE audit_logs a
SET user_id = u.auth_user_id::text
FROM usuarios u
WHERE a.user_id = u.id::text
  AND u.auth_user_id IS NOT NULL
  AND a.user_id <> u.auth_user_id::text;

-- logs_navegacao usa usuario_id
UPDATE logs_navegacao n
SET usuario_id = u.auth_user_id::text
FROM usuarios u
WHERE n.usuario_id = u.id::text
  AND u.auth_user_id IS NOT NULL
  AND n.usuario_id <> u.auth_user_id::text;

-- Validação
SELECT 'user_sessions' AS tabela, COUNT(*) AS pendentes
FROM user_sessions s
JOIN usuarios u
  ON s.user_id = u.id::text
WHERE u.auth_user_id IS NOT NULL

UNION ALL

SELECT 'audit_logs', COUNT(*)
FROM audit_logs a
JOIN usuarios u
  ON a.user_id = u.id::text
WHERE u.auth_user_id IS NOT NULL

UNION ALL

SELECT 'logs_navegacao', COUNT(*)
FROM logs_navegacao n
JOIN usuarios u
  ON n.usuario_id = u.id::text
WHERE u.auth_user_id IS NOT NULL;
