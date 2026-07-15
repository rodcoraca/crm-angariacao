# SQL MIGRATIONS

## Objetivo
Estabelecer este documento como o repositório oficial de todas as migrações SQL da plataforma OSFlow, centralizando o histórico estrutural da base de dados e a preparação das futuras alterações.

## Última revisão
2026-07-15

## Versão do documento
1.3.5

## Responsável
Engenharia da Plataforma OSFlow

## Identificador do documento
DOC-005

## Documentos Relacionados
- [INDEX.md](./INDEX.md)
- [DATABASE.md](./DATABASE.md)
- [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md)
- [SECURITY.md](./SECURITY.md)
- [SAAS.md](./SAAS.md)
- [DECISIONS.md](./DECISIONS.md)

## Índice
- 1. Introdução
- 2. Legenda
- 3. Migrações Executadas
- 4. Migrações Pendentes
- 5. Migrações Planeadas
- 6. Regras
- 7. Conclusão
- Histórico de Revisões
- Próximas Revisões

## Conteúdo

## 1. Introdução

Todas as alterações estruturais da base de dados deverão ser registadas neste documento antes da implementação. Este registo tem como objetivo garantir rastreabilidade, controlo de versões, clareza técnica e preservação do histórico de evolução da plataforma.

Cada migração deverá possuir, no mínimo, os seguintes campos:

- ID
- Data
- Título
- Descrição
- Estado
- Responsável
- Versão
- Script SQL
- Observações

## 2. Legenda

- 🟢 Executada
- 🟡 Pendente
- 🔵 Planeada
- 🔴 Cancelada

## 3. Migrações Executadas

| ID | Data | Título | Descrição | Estado | Responsável | Versão | Script SQL | Observações |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DB-001 |  | Campos de Visita nas Leads | Adição dos campos `data_visita`, `hora_visita`, `local_visita` e `status_visita`. | 🟢 Executada |  |  | Registar referência do script quando disponível. | Registo documental da alteração já considerada executada. |
| DB-002 |  | Preparação da arquitetura de Utilizadores | Preparação para Perfil, Organização e Preferências. | 🟢 Executada |  | 0.9.0 Beta | Registar referência do script quando disponível. | Estrutura de Utilizadores e Preferências em utilização na plataforma. |
| DB-006 | 2026-07-05 | Perfis | Estrutura de perfis com ligação a permissões e associação N:N com Utilizadores. | 🟢 Executada | Engenharia da Plataforma OSFlow | 0.9.1 Beta | [sql/migrations/20260705_db010_authz_core.sql](../sql/migrations/20260705_db010_authz_core.sql) | Implementação base de perfis (`roles`) e relação `user_roles` preparada para múltiplas empresas. |
| DB-005 |  | Auditoria | Registo de Login, Logout, Alteração de permissões, Criação de Utilizadores, Eliminação e Eventos críticos. | 🟢 Executada |  | 0.9.0 Beta | Registar referência do script quando disponível. | Registo de logs operacionais e rastreabilidade já em utilização na plataforma. |
| DB-010 | 2026-07-05 | Núcleo de Autorização (RBAC) | Criação das tabelas `roles`, `permissions`, `role_permissions` e `user_roles` com índices e escopo por `empresa_id`. | 🟢 Executada | Engenharia da Plataforma OSFlow | 0.9.1 Beta | [sql/migrations/20260705_db010_authz_core.sql](../sql/migrations/20260705_db010_authz_core.sql) | Infraestrutura de autenticação/autorização preparada para reutilização por todos os módulos sem alteração funcional imediata. |
| DB-011 | 2026-07-05 | Auditoria Central | Criação da tabela `audit_logs` para eventos automáticos de login, logout, create, update, delete e access_denied. | 🟢 Executada | Engenharia da Plataforma OSFlow | 0.9.1 Beta | [sql/migrations/20260705_db011_audit_logs.sql](../sql/migrations/20260705_db011_audit_logs.sql) | Infraestrutura central para trilha de auditoria reutilizável por serviços e módulos. |
| DB-012 | 2026-07-05 | Seed de Permissões | Inserção idempotente das permissões padrão (`view`, `create`, `edit`, `delete`) para todos os módulos existentes e permissões adicionais de gestão. | 🟢 Executada | Engenharia da Plataforma OSFlow | 0.9.1 Beta | [sql/migrations/20260705_db012_permission_seeds.sql](../sql/migrations/20260705_db012_permission_seeds.sql) | Regularização do catálogo de permissões para integração completa com Gestão de Utilizadores e controlo central de acesso. |
| DB-013 | 2026-07-05 | Hierarquia de Permissões | Adição de colunas `module_name`, `group_key`, `group_name` e `permission_name` na tabela `permissions` para suportar estrutura módulo→grupo→permissão. | 🟢 Executada | Engenharia da Plataforma OSFlow | 0.9.1 Beta | [sql/migrations/20260705_db013_permissions_hierarchy_columns.sql](../sql/migrations/20260705_db013_permissions_hierarchy_columns.sql) | Compatibilidade preservada com modelo atual (`module`, `action`, `code`) sem remoção de dados. |
| DB-004 | 2026-07-06 | Sessões de Utilizador | Criação da tabela `user_sessions` com registo de IP, User Agent, Dispositivo, Login, Logout e Última atividade. | 🟢 Executada | Engenharia da Plataforma OSFlow | 0.9.1 Beta | [sql/migrations/20260706_db004_user_sessions.sql](../sql/migrations/20260706_db004_user_sessions.sql) | Infraestrutura de sessão alinhada com o runtime atual de autenticação e auditoria operacional. |

## 4. Migrações Pendentes

| ID | Data | Título | Descrição | Estado | Responsável | Versão | Script SQL | Observações |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DB-014 | 2026-07-06 | Homologação de Colunas Estruturais | Adição idempotente de colunas estruturais base (`id`, `created_at`, `updated_at`, `ativo`, `created_by`, `updated_by`) nas entidades principais, quando ausentes. | 🟡 Pendente | Engenharia da Plataforma OSFlow | 0.9.1 Beta | [sql/migrations/20260706_db014_structural_contract_columns.sql](../sql/migrations/20260706_db014_structural_contract_columns.sql) | Não cria novas tabelas; aplica apenas `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. |
| DB-021 | 2026-07-10 | Persistência Estrutural de Preferências | Criação da tabela `user_preferences` (1:1 por `user_id`) com `idioma`, `tema`, `pagina_inicial`, `formato_data` e `notificacoes`. | 🟡 Pendente | Engenharia da Plataforma OSFlow | 0.9.2 Beta | [sql/migrations/20260710_db021_user_preferences.sql](../sql/migrations/20260710_db021_user_preferences.sql) | Preparação de backend sem alteração de UX; inclui backfill opcional a partir de `usuarios.permissoes`. |
| DB-022 | 2026-07-10 | Preparação Organizacional Mínima | Adição de colunas opcionais `departamento_id`, `supervisor_id`, `equipa_id` e `cargo_id` em `usuarios` para evolução estrutural. | 🟡 Pendente | Engenharia da Plataforma OSFlow | 0.9.2 Beta | [sql/migrations/20260710_db022_user_organizational_columns.sql](../sql/migrations/20260710_db022_user_organizational_columns.sql) | Sem CRUD, sem UX nova e sem implementação SaaS; apenas estrutura. |
| DB-023 | 2026-07-10 | Auditoria de Consistência de Utilizadores | Criação da função `public.listar_utilizadores_inconsistentes()` para diagnóstico A/B/C entre `usuarios` e `auth.users`, sem mutação de dados. | 🟡 Pendente | Engenharia da Plataforma OSFlow | 0.9.2 Beta | [sql/migrations/20260710_db023_user_consistency_diagnostic.sql](../sql/migrations/20260710_db023_user_consistency_diagnostic.sql) | Relatório somente leitura para regularização manual de identidade. |
| DB-024 | 2026-07-10 | Configuração Inicial de Organização e Preferências | Aplicação idempotente de configuração mínima para utilizador administrador (`departamento`, `cargo`, `idioma`, `tema`, `pagina inicial`, `formato data`) com fallback em `user_preferences` quando disponível. | 🟡 Pendente | Engenharia da Plataforma OSFlow | 0.9.2 Beta | [sql/migrations/20260710_db024_admin_org_preferences_bootstrap.sql](../sql/migrations/20260710_db024_admin_org_preferences_bootstrap.sql) | Não altera UX nem RBAC; apenas regularização inicial de dados. |
| DB-025 | 2026-07-10 | Discovery Engine — Provider Leads | Criação da tabela `provider_leads` para anúncios normalizados de providers, com deduplicação por provider e identificador externo. | 🟡 Pendente | Engenharia da Plataforma OSFlow | 0.9.2 Beta | [sql/migrations/20260710_db025_provider_leads_discovery_engine.sql](../sql/migrations/20260710_db025_provider_leads_discovery_engine.sql) | Apenas infraestrutura; sem RLS, RBAC, scheduler, scraping ou automação. |
| DB-026 | 2026-07-10 | Imovirtual Discovery — Campos Normalizados | Adição idempotente de campos de anúncio, proprietário, localização e publicação em `provider_leads`, com backfill a partir de `raw_data`. | 🟡 Pendente | Engenharia da Plataforma OSFlow | 0.9.2 Beta | [sql/migrations/20260710_db026_provider_leads_imovirtual_fields.sql](../sql/migrations/20260710_db026_provider_leads_imovirtual_fields.sql) | Sem alteração de RLS, autenticação ou RBAC. |
| DB-027 | 2026-07-13 | Ciclo de Vida de Conta de Utilizador | Adição de `account_status` em `usuarios` com estados `pending_activation/active/disabled` e carimbos `activation_sent_at`, `activated_at`, `disabled_at`, incluindo backfill idempotente. | 🟡 Pendente | Engenharia da Plataforma OSFlow | 0.9.3 Beta | [sql/migrations/20260713_db027_user_account_lifecycle.sql](../sql/migrations/20260713_db027_user_account_lifecycle.sql) | Preparação estrutural para ativação por convite e bloqueio administrativo sem sistema próprio de recuperação de password. |
| DB-028 | 2026-07-13 | Multi-tenant Scope Fase A | Adição de `empresa_id` (nullable) em `leads`, `provider_leads` e `estoque_nao_publicitado`, com índices de escopo e chave única de `provider_leads` por empresa. | 🟡 Pendente | Engenharia da Plataforma OSFlow | 0.9.3 Beta | [sql/migrations/20260713_db028_multi_tenant_scope_phase_a.sql](../sql/migrations/20260713_db028_multi_tenant_scope_phase_a.sql) | Isolamento mínimo por empresa no domínio operacional, sem RLS completo nesta fase. |
| DB-029 | 2026-07-15 | Administração de Empresas Beta (Mínima) | Criação da tabela `empresas` (`id`, `nome`, `slug`, `estado`, `created_at`, `updated_at`) com trigger de atualização e seed idempotente `osflow-beta`. | 🟡 Pendente | Engenharia da Plataforma OSFlow | 0.9.4 Beta | [sql/migrations/20260715_db029_empresas_beta_minima.sql](../sql/migrations/20260715_db029_empresas_beta_minima.sql) | Base mínima para evitar novos fluxos com `empresa_id` nulo em contexto Beta. |
| DB-030 | 2026-07-15 | Sincronização de Schema Empresas | Migração complementar para ambientes legados: adiciona `slug`, `estado` e `updated_at` em `empresas` com backfill de `slug` a partir de `nome`. | 🟡 Pendente | Engenharia da Plataforma OSFlow | 0.9.4 Beta | [sql/migrations/20260715_db030_empresas_schema_sync.sql](../sql/migrations/20260715_db030_empresas_schema_sync.sql) | Corrige divergência entre schema legado (`id,nome,ativo,created_at`) e módulo Administração → Empresas. |

## 5. Migrações Planeadas

| ID | Data | Título | Descrição | Estado | Responsável | Versão | Script SQL | Observações |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DB-003 |  | Preparação SaaS | Preparação dos campos `empresa_id`, `role_id`, `departamento_id`, `equipa_id` e `supervisor_id`. | 🔵 Planeada |  |  | Documentar antes da execução. | Base estrutural para isolamento organizacional e Multi-Tenant. |
| DB-007 |  | Empresas | Tabela Empresas para suporte à arquitetura Multi-Tenant. | 🔵 Planeada |  |  | Documentar antes da execução. | Base estrutural para segregação por Empresa. |
| DB-008 |  | Planos | Planos SaaS: Starter, Professional e Enterprise. | 🔵 Planeada |  |  | Documentar antes da execução. | Preparação da lógica comercial e contratual da plataforma. |
| DB-009 |  | Assinaturas | Estrutura para Subscrições, Pagamento, Renovação e Estado. | 🔵 Planeada |  |  | Documentar antes da execução. | Suporte à gestão do ciclo de vida de assinatura SaaS. |

## 6. Regras

As seguintes regras são oficiais para a gestão de migrações SQL da plataforma OSFlow:

- Nenhuma alteração estrutural poderá ser implementada sem estar previamente registada neste documento.
- Todo SQL deverá possuir histórico.
- Nenhuma migração deverá ser perdida.

Estas regras devem ser respeitadas em qualquer evolução da base de dados, independentemente da urgência, dimensão da alteração ou módulo impactado.

## 7. Conclusão

Este documento é o histórico oficial de evolução da base de dados da OSFlow.

Toda mudança estrutural futura deverá ser documentada aqui antes da implementação, preservando consistência, rastreabilidade e controlo técnico da evolução da plataforma.

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
| --- | --- | --- | --- |
| 1.3.5 | 2026-07-15 | Engenharia da Plataforma OSFlow | Registo da DB-030 (pendente) para sincronização complementar do schema de `empresas` com colunas `slug`, `estado` e `updated_at` + backfill de slug. |
| 1.3.4 | 2026-07-15 | Engenharia da Plataforma OSFlow | Registo da DB-029 (pendente) para Administração de Empresas Beta mínima com tabela `empresas`, trigger de `updated_at` e seed idempotente `osflow-beta`. |
| 1.3.3 | 2026-07-13 | Engenharia da Plataforma OSFlow | Registo da DB-028 (pendente) com escopo multi-tenant Fase A em `leads`, `provider_leads` e `estoque_nao_publicitado`. |
| 1.3.2 | 2026-07-13 | Engenharia da Plataforma OSFlow | Registo da DB-027 (pendente) com ciclo de vida de conta em `usuarios` (`pending_activation`, `active`, `disabled`) e timestamps de ativação/desativação. |
| 1.3.0 | 2026-07-10 | Engenharia da Plataforma OSFlow | Registo da DB-025, infraestrutura do Discovery Engine para `provider_leads`, sem alteração de UX, autenticação ou RBAC. |
| 1.2.9 | 2026-07-10 | Engenharia da Plataforma OSFlow | Registo da DB-024 (pendente) para configuração inicial mínima de organização e preferências do administrador, de forma idempotente e sem alteração de UX/autenticação/RBAC. |
| 1.2.8 | 2026-07-10 | Engenharia da Plataforma OSFlow | Registo da DB-023 (pendente) com função de diagnóstico de inconsistências A/B/C entre `usuarios` e `auth.users`, sem alteração automática de dados. |
| 1.2.7 | 2026-07-10 | Engenharia da Plataforma OSFlow | Registo da DB-022 (pendente) para preparação organizacional mínima em `usuarios` com colunas opcionais de estrutura. |
| 1.2.6 | 2026-07-10 | Engenharia da Plataforma OSFlow | Registo da DB-021 (pendente) para persistência estrutural de preferências em `user_preferences` com ligação 1:1 por `user_id`. |
| 1.2.5 | 2026-07-06 | Engenharia da Plataforma OSFlow | Registo da DB-014 (pendente) para homologação do contrato estrutural de colunas nas entidades principais. |
| 1.2.4 | 2026-07-06 | Engenharia da Plataforma OSFlow | Registo da execução de DB-004 com criação da tabela `user_sessions` e índices operacionais para sessão. |
| 1.2.3 | 2026-07-05 | Engenharia da Plataforma OSFlow | Registo da execução de DB-013 com adaptação hierárquica da tabela `permissions` para módulo, grupo e permissão com retrocompatibilidade. |
| 1.2.2 | 2026-07-05 | Engenharia da Plataforma OSFlow | Registo da execução de DB-012 com seed idempotente de permissões por módulo (`module.view/create/edit/delete`) e permissões adicionais. |
| 1.2.1 | 2026-07-05 | Engenharia da Plataforma OSFlow | Registo da execução de DB-011 com infraestrutura de auditoria central (`audit_logs`) e referência de script SQL. |
| 1.2.0 | 2026-07-05 | Engenharia da Plataforma OSFlow | Registo da execução de DB-006 e DB-010 com criação do núcleo RBAC (`roles`, `permissions`, `role_permissions`, `user_roles`) e referência do script SQL. |
| 1.1.0 | 2026-07-04 | Engenharia da Plataforma OSFlow | Atualização do estado das migrações para a versão 0.9.0 Beta, marcando como executadas as migrações efetivamente já refletidas na plataforma. |
| 1.0.0 | 2026-07-03 | Engenharia da Plataforma OSFlow | Consolidação do repositório oficial de migrações SQL com padronização documental e reorganização por estado. |

## Próximas Revisões

- Preencher datas, responsáveis, versões e referência de script SQL à medida que novas migrações forem aprovadas.
- Relacionar cada migração com sprint, decisão técnica e módulo impactado.
- Acrescentar histórico de execução quando houver entrada de novas migrações.
