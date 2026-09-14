-- ============================================================
-- DB-059
-- Permissoes base do modulo Empreendimentos
-- ============================================================

BEGIN;

INSERT INTO public.permissions (module, action, code, description, is_active)
VALUES
    ('empreendimentos', 'view', 'empreendimentos.view', 'Permite visualizar empreendimentos.', true),
    ('empreendimentos', 'create', 'empreendimentos.create', 'Permite criar empreendimentos.', true),
    ('empreendimentos', 'edit', 'empreendimentos.edit', 'Permite editar empreendimentos.', true),
    ('empreendimentos', 'delete', 'empreendimentos.delete', 'Permite eliminar empreendimentos.', true)
ON CONFLICT (code) DO NOTHING;

COMMIT;
