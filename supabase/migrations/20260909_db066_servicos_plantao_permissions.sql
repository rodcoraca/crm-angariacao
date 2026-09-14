-- ============================================================
-- DB-066
-- Permissoes base dos modulos Servico e Plantao
-- ============================================================

BEGIN;

INSERT INTO public.permissions (module, action, code, description, is_active)
VALUES
    ('servico', 'view', 'servico.view', 'Permite visualizar serviços.', true),
    ('servico', 'create', 'servico.create', 'Permite criar serviços.', true),
    ('servico', 'edit', 'servico.edit', 'Permite editar serviços.', true),
    ('servico', 'delete', 'servico.delete', 'Permite eliminar serviços.', true),

    ('plantao', 'view', 'plantao.view', 'Permite visualizar plantões.', true),
    ('plantao', 'create', 'plantao.create', 'Permite criar plantões.', true),
    ('plantao', 'edit', 'plantao.edit', 'Permite editar plantões.', true),
    ('plantao', 'delete', 'plantao.delete', 'Permite eliminar plantões.', true)
ON CONFLICT (code) DO NOTHING;

COMMIT;
