# DATABASE

## Objetivo
Organizar a documentação oficial sobre estrutura de dados, entidades, relacionamentos, convenções e princípios de persistência da plataforma OSFlow.

## Última revisão
2026-07-10

## Versão do documento
1.3.2

## Responsável
Engenharia da Plataforma OSFlow

## Identificador do documento
DOC-004

## Documentos Relacionados
- [INDEX.md](./INDEX.md)
- [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md)
- [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)
- [SECURITY.md](./SECURITY.md)
- [SAAS.md](./SAAS.md)
- [DECISIONS.md](./DECISIONS.md)

## Índice
- 1. Visão Geral
- 2. Princípios de Dados
- 3. Domínios Principais
- 4. Relacionamentos Nucleares
- 5. Convenções
- 6. Estruturas Previstas
- 7. Rastreabilidade com Migrações SQL
- 8. Conclusão
- Histórico de Revisões
- Próximas Revisões

## Conteúdo

## 1. Visão Geral

Este documento descreve o modelo lógico de dados da plataforma OSFlow e a forma como as entidades devem ser organizadas para suportar CRM, Gestão de Imóveis, Segurança, Utilizadores e evolução futura para SaaS.

## 2. Princípios de Dados

- DEC-002: nunca duplicar informação.
- DEC-002: manter uma única fonte de verdade para cada dado.
- DEC-006: documentar toda alteração estrutural antes da implementação.
- DEC-007: preparar a base de dados para segregação por Empresa.

## 3. Domínios Principais

| Identificador | Domínio | Descrição |
| --- | --- | --- |
| DB-001 | Leads | Estrutura para oportunidades comerciais e agendamento de visita. |
| DB-002 | Utilizadores | Identidade, autenticação, permissões, perfis e preferências. |
| DB-003 | Organização | Preparação para Empresa, Departamento, Supervisor, Equipa e Cargo. |
| DB-004 | Sessões | Registo operacional de sessões de Utilizador. |
| DB-005 | Auditoria | Registo de eventos críticos e rastreabilidade. |
| DB-006 | Perfis | Separação entre Utilizador, Perfil e permissões. |
| DB-007 | Empresas | Base de isolamento Multi-Tenant. |
| DB-008 | Planos | Estrutura de planos SaaS. |
| DB-009 | Assinaturas | Ciclo de vida contratual e financeiro. |
| DB-010 | Autorização (RBAC) | Perfis, permissões e relações N:N para autorização por módulo e por empresa. |
| DB-025 | Discovery Engine | Anúncios normalizados por providers para futura captação de imóveis particulares. |

## 4. Relacionamentos Nucleares

Os relacionamentos estruturais esperados são:

- Utilizador possui autenticação, sessão, permissões, perfil e preferências.
- Vínculo entre identidade autenticada e perfil operacional ocorre por `usuarios.auth_user_id` ↔ `auth.users.id`.
- Agente representa função comercial associada a um Utilizador.
- Lead pode estar associada a Agente, Imóvel, Documentos e atividades operacionais.
- Empresa agrupa Utilizadores, Agentes, Leads, Imóveis e Documentos no contexto SaaS.
- Sessões e Auditoria devem manter vínculo com Utilizador e contexto de acesso.
- Perfis devem ser ligados por `role_id`, preservando separação entre identidade e autorização.

## 5. Convenções

- Utilizar identificadores estáveis e rastreáveis por documento e migração.
- Toda tabela futura relacionada com SaaS deverá prever `empresa_id` quando aplicável.
- Toda informação de segurança deverá possuir histórico consultável.
- Toda nomenclatura deverá respeitar os termos oficiais: Utilizador, Agente, Empresa, Dashboard, Cockpit Executivo e Plataforma Operacional.

## 6. Estruturas Previstas

As seguintes estruturas encontram-se oficialmente previstas, sem implicar implementação imediata:

- `data_visita`, `hora_visita`, `local_visita`, `status_visita` para Leads.
- estrutura de Auditoria para eventos críticos.
- estrutura de Perfis ligada por `role_id`.
- tabelas `roles`, `permissions`, `role_permissions` e `user_roles` com `empresa_id` opcional para escopo multiempresa.
- estrutura de Empresas, Planos e Assinaturas para SaaS.
- `provider_leads` para anúncios normalizados por provider, com unicidade em `provider` + `external_id` e preparação para processamento futuro.

### 6.2 Contrato Oficial de Logs

- `audit_logs`: fonte oficial de auditoria operacional (segurança, mutações críticas, acesso negado e rastreabilidade formal).
- `logs_navegacao`: telemetria e analytics de navegação (métricas operacionais e comportamento de uso).
- `logs_navegacao` não substitui `audit_logs` para requisitos de auditoria, segurança ou conformidade.

### 6.1 Contrato Implementado (Identity & Access)

Estado consolidado entre código e migrações executadas:

| Entidade | Estado | Fonte |
| --- | --- | --- |
| `auth.users` | Implementada (Supabase Auth) | Infraestrutura Supabase |
| `usuarios` | Implementada (perfil de negócio) | DB-002 (execução registada) |
| `roles` | Implementada | DB-010 |
| `permissions` | Implementada | DB-010, DB-012, DB-013 |
| `role_permissions` | Implementada | DB-010 |
| `user_roles` | Implementada | DB-010 |
| `user_sessions` | Implementada | DB-004 |
| `audit_logs` | Implementada | DB-011 |

Contrato operacional atual em `usuarios` (código):

- `auth_user_id`
- `nome`
- `apelido`
- `email`
- `telefone`
- `username`
- `ativo`
- `permissoes`
- `empresa_id`
- `departamento_id` (opcional)
- `supervisor_id` (opcional)
- `equipa_id` (opcional)
- `cargo_id` (opcional)

## 7. Rastreabilidade com Migrações SQL

| Documento | Decisão | Migração | Estado |
| --- | --- | --- | --- |
| [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | DEC-004 | DB-002 | Planeada |
| [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | DEC-004 | DB-006 | Executada |
| [SECURITY.md](./SECURITY.md) | DEC-005 | DB-010 | Executada |
| [SECURITY.md](./SECURITY.md) | DEC-005 | DB-004 | Executada |
| [SECURITY.md](./SECURITY.md) | DEC-005 | DB-005 | Executada |
| [SAAS.md](./SAAS.md) | DEC-007 | DB-007 | Planeada |
| [SAAS.md](./SAAS.md) | DEC-007 | DB-008 | Planeada |
| [SAAS.md](./SAAS.md) | DEC-007 | DB-009 | Planeada |

## 8. Conclusão

Este documento define a visão lógica oficial da base de dados da OSFlow e deve ser consultado em conjunto com as migrações SQL, a arquitetura, a segurança e o roadmap.

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
| --- | --- | --- | --- |
| 1.3.2 | 2026-07-10 | Engenharia da Plataforma OSFlow | Registo da entidade `provider_leads` e da infraestrutura inicial do Discovery Engine (DB-025), sem scheduler, scraping, automações ou alterações de RBAC. |
| 1.3.1 | 2026-07-10 | Engenharia da Plataforma OSFlow | Atualização do contrato operacional de `usuarios` com campos organizacionais opcionais (`departamento_id`, `supervisor_id`, `equipa_id`, `cargo_id`). |
| 1.3.0 | 2026-07-06 | Engenharia da Plataforma OSFlow | Formalização do contrato oficial de logs: `audit_logs` para auditoria operacional e `logs_navegacao` para telemetria/analytics. |
| 1.2.0 | 2026-07-06 | Engenharia da Plataforma OSFlow | Sincronização do contrato com o estado executado: DB-004 marcado como executada (`user_sessions`) e vínculo oficial `usuarios.auth_user_id` ↔ `auth.users.id`. |
| 1.1.0 | 2026-07-05 | Engenharia da Plataforma OSFlow | Inclusão do domínio DB-010 (Autorização RBAC), registo das tabelas de perfis/permissões e atualização da rastreabilidade com migrações executadas. |
| 1.0.0 | 2026-07-03 | Engenharia da Plataforma OSFlow | Consolidação do modelo lógico de dados, convenções e rastreabilidade estrutural. |

## Próximas Revisões

- Detalhar entidades e cardinalidades por módulo.
- Acrescentar mapa de ownership entre Utilizador, Agente, Empresa e Leads.
- Formalizar catálogo lógico de tabelas futuras por domínio.
