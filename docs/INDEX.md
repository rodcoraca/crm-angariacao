# OSFLOW DOCUMENTATION INDEX

## Objetivo
Estabelecer este documento como o índice oficial da documentação da plataforma OSFlow, centralizando o acesso aos documentos técnicos, estruturais, operacionais e estratégicos da Plataforma Operacional.

## Última revisão
2026-07-03

## Versão do documento
1.0.0

## Responsável
Engenharia da Plataforma OSFlow

## Identificador do documento
DOC-001

## Documentos Relacionados
- [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md)
- [ROADMAP.md](./ROADMAP.md)
- [DATABASE.md](./DATABASE.md)
- [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)
- [SECURITY.md](./SECURITY.md)
- [SAAS.md](./SAAS.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [DECISIONS.md](./DECISIONS.md)

## Índice
- 1. Introdução
- 2. Arquitetura
- 3. Roadmap
- 4. Base de Dados
- 5. Migrações SQL
- 6. Segurança
- 7. SaaS
- 8. Changelog
- 9. Decisões Técnicas
- 10. Módulos da Plataforma
- 11. Implementações Futuras
- 12. Roadmap SaaS
- 13. Matriz de Rastreabilidade
- 14. Observações
- 15. Estado Atual da Plataforma
- Histórico de Revisões
- Próximas Revisões

## Conteúdo

## 1. Introdução

Este documento é o ponto de entrada para toda a documentação técnica da plataforma OSFlow. A sua função é organizar, referenciar e preparar a evolução documental da Plataforma Operacional, garantindo coerência entre arquitetura, segurança, base de dados, SaaS, roadmap e decisões técnicas.

## 2. Arquitetura

### Referência
[OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md)

### Descrição
Arquitetura oficial da plataforma, incluindo princípios arquitetónicos, organização modular, modelo de Utilizador, segurança estrutural, preparação SaaS e Design System.

## 3. Roadmap

### Referência
[ROADMAP.md](./ROADMAP.md)

### Descrição
Planeamento das próximas versões, organizado por Sprint Atual, Sprint Seguinte, Backlog e Longo Prazo.

## 4. Base de Dados

### Referência
[DATABASE.md](./DATABASE.md)

### Descrição
- Modelo de dados.
- Relacionamentos.
- Convenções.
- Estrutura lógica das tabelas.

## 5. Migrações SQL

### Referência
[SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)

### Descrição
Repositório oficial das alterações estruturais da base de dados, com histórico, estado, versionamento e rastreabilidade por migração.

### Estrutura de registo

| ID | Data | Título | Estado | Versão | Responsável | Documento relacionado |
| --- | --- | --- | --- | --- | --- | --- |
| DB-001 |  | Campos de Visita nas Leads | Executada |  |  | [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md) |
| DB-004 |  | Sessões de Utilizador | Planeada |  |  | [SECURITY.md](./SECURITY.md) |

## 6. Segurança

### Referência
[SECURITY.md](./SECURITY.md)

### Descrição
- Sessões
- Autenticação
- Auditoria
- Registo de IP
- 2FA futura

## 7. SaaS

### Referência
[SAAS.md](./SAAS.md)

### Descrição
- Arquitetura Multi-Tenant
- Empresa
- Planos
- Assinaturas
- Provisionamento
- Pagamentos

## 8. Changelog

### Referência
[CHANGELOG.md](./CHANGELOG.md)

### Descrição
Histórico oficial de versões da plataforma e das entregas documentais e estruturais da Sprint 0.

## 9. Decisões Técnicas

### Referência
[DECISIONS.md](./DECISIONS.md)

### Descrição
Registo oficial das decisões arquitetónicas aprovadas, utilizando identificadores `DEC-xxx` e ligação aos documentos relacionados.

## 10. Módulos da Plataforma

| Identificador | Módulo | Estado documental | Documento atual | Apontamento futuro |
| --- | --- | --- | --- | --- |
| CRM-001 | Landing | Parcial | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | Criar documento dedicado da Landing |
| CRM-002 | CRM | Parcial | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | Criar documento funcional do CRM |
| CRM-003 | Leads | Parcial | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | Criar documento funcional de Leads |
| CRM-004 | Pipeline | Parcial | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | Criar documento funcional do Pipeline |
| CRM-005 | Dashboard | Parcial | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | Consolidar KPIs e regras do Dashboard |
| CRM-006 | Cockpit Executivo | Pendente | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | Criar documento dedicado do Cockpit Executivo |
| CRM-007 | Imóveis | Parcial | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | Criar documento funcional de Imóveis |
| CRM-008 | Documentos | Parcial | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | Criar documento funcional de Documentos |
| CRM-009 | Agenda | Pendente | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | Criar documento dedicado da Agenda |
| CRM-010 | Utilizadores | Parcial | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | Detalhar modelo de Utilizador e Agente |
| CRM-011 | Logs | Parcial | [SECURITY.md](./SECURITY.md) | Formalizar taxonomia de logs e auditoria |
| CRM-012 | Configurações | Pendente | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | Criar documento dedicado de Configurações |
| CRM-013 | Business Intelligence | Pendente | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | Criar documento dedicado de Business Intelligence |

## 11. Implementações Futuras

Funcionalidades aprovadas mas ainda não implementadas ou sem documentação dedicada consolidada.

| Prioridade | Identificador | Iniciativa | Documento de referência | Apontamento documental |
| --- | --- | --- | --- | --- |
| Alta prioridade | SEC-001 | Sessão única por Utilizador | [SECURITY.md](./SECURITY.md) | Coberta documentalmente |
| Alta prioridade | DB-004 | Sessões de Utilizador | [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md) | Coberta documentalmente |
| Alta prioridade | DB-005 | Auditoria | [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md) | Coberta documentalmente |
| Média prioridade | SAAS-003 | Empresas Multi-Tenant | [SAAS.md](./SAAS.md) | Coberta documentalmente |
| Média prioridade | SAAS-004 | Planos e Assinaturas | [SAAS.md](./SAAS.md) | Coberta documentalmente |
| Média prioridade | CRM-009 | Agenda | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | Criar documento dedicado da Agenda |
| Baixa prioridade | CRM-006 | Cockpit Executivo | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | Criar documento dedicado do Cockpit Executivo |
| Baixa prioridade | CRM-013 | Business Intelligence | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | Criar documento dedicado de Business Intelligence |

## 12. Roadmap SaaS

Área dedicada à evolução da plataforma no contexto SaaS.

| Identificador | Tema | Documento atual | Necessidade futura |
| --- | --- | --- | --- |
| SAAS-001 | Arquitetura Multi-Tenant | [SAAS.md](./SAAS.md) | Refinar políticas de isolamento |
| SAAS-002 | Empresa | [SAAS.md](./SAAS.md) | Detalhar onboarding por Empresa |
| SAAS-003 | Planos | [SAAS.md](./SAAS.md) | Formalizar catálogo comercial |
| SAAS-004 | Assinaturas | [SAAS.md](./SAAS.md) | Detalhar ciclo de vida de subscrição |
| SAAS-005 | Stripe | [SAAS.md](./SAAS.md) | Criar documentação específica de pagamentos |
| SAAS-006 | Portal Cliente | [SAAS.md](./SAAS.md) | Criar documento funcional do portal |
| SAAS-007 | Provisionamento | [SAAS.md](./SAAS.md) | Definir fluxos operacionais |
| SAAS-008 | API | [SAAS.md](./SAAS.md) | Criar documentação dedicada da API |

## 13. Matriz de Rastreabilidade

| Decisão | Documento | SQL | Módulo | Sprint |
| --- | --- | --- | --- | --- |
| DEC-001 | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | DB-001 | CRM-003 Leads | ROAD-001 |
| DEC-002 | [DATABASE.md](./DATABASE.md) | DB-003 | CRM-010 Utilizadores | ROAD-002 |
| DEC-004 | [SECURITY.md](./SECURITY.md) | DB-004 | CRM-010 Utilizadores | ROAD-001 |
| DEC-005 | [SECURITY.md](./SECURITY.md) | DB-005 | CRM-011 Logs | ROAD-001 |
| DEC-007 | [SAAS.md](./SAAS.md) | DB-007 | SAAS-002 Empresa | ROAD-003 |
| DEC-008 | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) | DB-008 | CRM-006 Cockpit Executivo | ROAD-004 |

## 14. Observações

- Toda alteração estrutural da plataforma deverá ser registada na documentação antes da implementação.
- Não foram identificadas referências quebradas entre os documentos consolidados da Sprint 0.
- Todos os documentos da pasta `docs` passaram a possuir título, objetivo, última revisão, versão, responsável, índice, conteúdo, histórico e próximas revisões.
- Não foram identificadas decisões contraditórias após a normalização por identificadores oficiais.
- As iniciativas sem documento dedicado já possuem apontamento formal para futura documentação.

## 15. Estado Atual da Plataforma

| Área | Estado |
| --- | --- |
| Arquitetura | Implementado |
| Documentação | Implementado |
| Segurança | Em desenvolvimento |
| Base de Dados | Em desenvolvimento |
| Frontend | Em desenvolvimento |
| Backend | Em desenvolvimento |
| Landing | Em desenvolvimento |
| CRM | Em desenvolvimento |
| SaaS | Planeado |

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
| --- | --- | --- | --- |
| 1.0.0 | 2026-07-03 | Engenharia da Plataforma OSFlow | Consolidação da documentação oficial da Sprint 0, com padronização estrutural, rastreabilidade e validação de consistência. |

## Próximas Revisões

- Criar documentação dedicada para Agenda, Cockpit Executivo, Business Intelligence, Configurações e API.
- Evoluir a matriz de rastreabilidade conforme novas decisões, migrações SQL e sprints forem aprovadas.
- Atualizar o estado atual da plataforma a cada ciclo de entrega.
