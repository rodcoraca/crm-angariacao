# OSFlow Deploy Baseline

## Estado atual

Baseline ID: OSFLOW-BASELINE-20260922-DB079-DEPLOYED
Data: 2026-09-22
Git commit: 7fa6773af4084fb1d94b75d3f66897d1a7ed8c6b
Branch: main
Estado do worktree: dirty; existem alteracoes locais nao commitadas.

Este baseline representa o estado efetivamente implantado da funcionalidade Leads -> Acompanhamento no linked remote. O historico `schema_migrations` remoto continua sem registar manualmente o deploy DB-079.

## Database

Ultima migration registada remotamente: 20260903_db058_unidades_unique_fracao
Ultima migration homologada para este worktree: DB-079, com excecoes documentadas abaixo
Migrations relevantes posteriores ainda nao homologadas:
- 20260911_db070_radar_lead_import_claim.sql
- 20260911_db071_lead_commercial_statuses.sql
- 20260917_db074_radar_imported_at.sql
- 20260917_db076_lead_lembretes_personal_scope.sql
- 20260922_db077_leads_acompanhamento.sql
- 20260922_db078_leads_acompanhamento_hardening.sql
- 20260922_db079_leads_acompanhamento_global_kpis.sql

Ordem de execucao prevista para o delta desta funcionalidade:
1. DB-070
2. DB-076
3. DB-077
4. DB-078

Estado da ordem operacional:
- DB-070: nao reaplicada; objetos e indice ja estavam refletidos remotamente.
- DB-076: nao reaplicada; RLS e indices ja estavam refletidos remotamente.
- DB-077: aplicada diretamente com o SQL local corrigido.
- DB-078: aplicada diretamente com o SQL local corrigido.
- DB-079: aplicada e corrigida diretamente com `CREATE OR REPLACE`; agregação final validada.

## Frontend

Commit/version: commit 7fa6773af4084fb1d94b75d3f66897d1a7ed8c6b; package version 0.1.0
Build validado: nao. O build atual falha por warnings/lint preexistentes fora do escopo desta fase.

## Edge Functions

Nenhuma Edge Function foi verificada ou incluida neste baseline.

## RBAC

Permissao local relevante: leads.acompanhamento.view
Estado remoto: criada e associada ao role ADMIN.
Role autorizado previsto na migration DB-078: ADMIN.
Estado remoto dos roles: ADMIN recebeu a permissao; os restantes roles nao receberam.

## RLS

Policies relevantes:
- lead_lembretes: escopo pessoal por criado_por, presente remotamente.
- empresa_provider_listings: tenant-scoped, presente remotamente.
- leads: policies legadas permissivas removidas; policies tenant-scoped ativas.
- audit_logs: RLS aplicada por DB-077.

## RPC

Funcoes relevantes:
- radar_claim_lead_import: corrigida por DB-078; autoria deriva do perfil autenticado.
- radar_complete_lead_import: corrigida por DB-078; autoria deriva do perfil autenticado.
- leads_acompanhamento: aplicada por DB-077/DB-078.
- leads_acompanhamento_global_kpis: aplicada por DB-079; assinatura e grant validados.

## Estado

Codigo: alteracoes locais nao commitadas; deploy de database concluido.
Database: DB-077, DB-078 e DB-079 aplicadas; DB-070 e DB-076 preservadas por ja estarem refletidas.
Frontend: testes executados; build nao validado com sucesso.
Edge Functions: nao verificado.

## Ultimo deploy

Data: 2026-09-22.
Executado por: GitHub Copilot, sob autorizacao explicita do utilizador.
Metodo: `supabase db query --linked --file`, DB-077 seguido de DB-078 e DB-079.
Resultado: sucesso; sem migration repair e sem alteracao artificial de schema_migrations.

## Validacoes

Build: FAIL por lint/warnings preexistentes fora do escopo.
Tests: 197 aprovados, 1 teste legado falhando; testes focados 4 aprovados.
Lint: ficheiros tocados validados sem erros.
Database: Supabase schema lint passou; dry-run DB-079 e execução autenticada passaram.
RLS: policies e flags verificadas remotamente; testes autenticados end-to-end pendentes.
RBAC: permissao criada e associada ao ADMIN.

## Excecoes conhecidas

- DB-070 e DB-076 possuem objetos remotos nao registados no historico de migrations.
- O remoto possui quatro empresas, mas apenas uma possui Leads; teste cross-tenant com dados reais nao foi concluido.
- DB-070 e DB-076 nao foram reaplicadas porque os seus objetos ja estavam refletidos remotamente.
- O historico remoto nao foi reparado.
- O teste legado src/App.test.js continua falhando com renders learn react link.
- Nao existe harness de sessao autenticada para teste funcional ADMIN/utilizador sem permissao.
- O cross-tenant test de dados nao foi executado: apenas uma das quatro empresas possui Leads.
- DB-079 validada com ADMIN: total 41, novas 18, acompanhadas 23, importadas 22, sem Lead CRM 16.
- RPC sem sessão e consulta de empresa diferente devolvem `forbidden`.

## Observacoes

Antes de qualquer deploy futuro, consultar este ficheiro e docs/OSFLOW_DEPLOY_STATE.json, executar scripts/check-deploy-baseline.ps1, validar o delta e obter autorizacao explicita do utilizador.
