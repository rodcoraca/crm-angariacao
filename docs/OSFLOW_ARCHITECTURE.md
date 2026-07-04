# OSFLOW ARCHITECTURE

## Objetivo
Estabelecer este documento como a referência oficial da arquitetura da plataforma OSFlow, definindo princípios, módulos, responsabilidades estruturais e critérios obrigatórios para a evolução da Plataforma Operacional.

## Última revisão
2026-07-03

## Versão do documento
1.0.0

## Responsável
Engenharia da Plataforma OSFlow

## Identificador do documento
DOC-002

## Documentos Relacionados
- [INDEX.md](./INDEX.md)
- [ROADMAP.md](./ROADMAP.md)
- [DATABASE.md](./DATABASE.md)
- [SECURITY.md](./SECURITY.md)
- [SAAS.md](./SAAS.md)
- [DECISIONS.md](./DECISIONS.md)

## Índice
- 1. Visão da Plataforma
- 2. Princípios Arquitetónicos
- 3. Organização dos Módulos
- 4. Modelo de Utilizadores
- 5. Segurança
- 6. Organização
- 7. SaaS
- 8. Design System
- 9. Roadmap Técnico
- 10. Conclusão
- Histórico de Revisões
- Próximas Revisões

## Conteúdo

## 1. Visão da Plataforma

A OSFlow é definida como uma Plataforma Operacional para Imobiliárias, concebida para centralizar processos comerciais, operacionais, documentais e analíticos numa base estrutural única.

O CRM é apenas um dos módulos da plataforma. A visão oficial da OSFlow não se limita à gestão de Leads e contactos, mas à orquestração completa da operação imobiliária, com capacidade para suportar crescimento funcional, governança de dados, segurança e evolução futura em regime SaaS.

A plataforma deverá integrar os seguintes domínios:

- CRM
- Pipeline
- Gestão de Imóveis
- Documentação
- Agenda
- Dashboard
- Cockpit Executivo
- Business Intelligence
- Relatórios
- Utilizadores
- Segurança
- SaaS

## 2. Princípios Arquitetónicos

Os seguintes princípios são definidos como oficiais:

- DEC-001: o CRM é um módulo da Plataforma Operacional, e não a totalidade da solução.
- DEC-002: nunca duplicar informação e manter uma única fonte de verdade para cada dado.
- DEC-003: separar UI, lógica de negócio e acesso aos dados.
- DEC-006: documentar toda alteração estrutural e toda migração SQL antes da implementação.
- DEC-007: preparar a plataforma permanentemente para SaaS.

Qualquer iniciativa que entre em conflito com estes princípios deve ser revista antes da implementação.

## 3. Organização dos Módulos

Os módulos da plataforma devem permanecer coerentes, desacoplados e documentados.

| Identificador | Módulo | Responsabilidade principal |
| --- | --- | --- |
| CRM-001 | Landing | Apresentação institucional e entrada de Utilizadores na plataforma. |
| CRM-002 | CRM | Gestão operacional de relacionamento comercial. |
| CRM-003 | Leads | Registo, classificação e acompanhamento de oportunidades. |
| CRM-004 | Pipeline | Controlo visual e operacional do fluxo comercial. |
| CRM-005 | Imóveis | Gestão estruturada dos ativos imobiliários. |
| CRM-006 | Documentos | Organização documental e checklist operacional. |
| CRM-007 | Mensagens | Gestão de comunicações padronizadas. |
| CRM-008 | Dashboard | Consolidação de indicadores e visão operacional. |
| CRM-009 | Cockpit Executivo | Visão executiva, tática e de acompanhamento estratégico. |
| CRM-010 | Utilizadores | Identidade, permissões, perfis e preferências. |
| CRM-011 | Logs | Auditoria, rastreabilidade e histórico operacional. |
| CRM-012 | Configurações | Parametrização global e regras sistémicas. |

## 4. Modelo de Utilizadores

O modelo oficial de identidade da plataforma é o seguinte:

- DEC-004: Utilizador representa uma pessoa.
- DEC-004: Permissões pertencem ao Utilizador.
- DEC-004: Perfil pertence ao Utilizador.
- DEC-004: Sessão pertence ao Utilizador.
- DEC-004: Autenticação pertence ao Utilizador.
- DEC-004: Agente representa uma função comercial.
- DEC-004: Nem todo Utilizador é Agente.

Esta separação é obrigatória para preservar clareza entre identidade, acesso e função operacional.

## 5. Segurança

A base de segurança arquitetural é regida pelas seguintes decisões:

- DEC-005 / SEC-001: uma única sessão ativa por Utilizador.
- DEC-005 / SEC-002: registo de IP por sessão.
- DEC-005 / SEC-003: auditoria de acessos.
- DEC-005 / SEC-004: histórico de login.
- DEC-005 / SEC-005: preparação para 2FA.

Sempre que existir conflito entre velocidade de entrega e segurança, a segurança deve prevalecer.

## 6. Organização

A arquitetura deve reservar estrutura para a modelação futura de:

- Empresa
- Departamento
- Supervisor
- Equipa
- Cargo

Esta camada ainda não está formalmente implementada, mas a sua futura inclusão não pode ser bloqueada por decisões atuais.

## 7. SaaS

A plataforma é oficialmente orientada para modelo Multi-Tenant.

Cada Empresa deverá possuir isolamento próprio sobre:

- Utilizadores
- Agentes
- Clientes
- Leads
- Imóveis
- Documentos

Tudo deverá permanecer isolado por Empresa.

## 8. Design System

O Design System oficial da OSFlow deverá ser sustentado por:

- UI-001: componentes reutilizáveis.
- UI-002: tokens de interface.
- UI-003: theme centralizado.
- UI-004: tipografia padronizada.
- UI-005: paleta visual consistente.

O objetivo é garantir consistência visual, previsibilidade de implementação e redução de duplicação na camada de UI.

## 9. Roadmap Técnico

O roadmap técnico arquitetural deverá contemplar:

- ROAD-001: reforço de segurança e sessões de Utilizador.
- ROAD-002: consolidação do modelo de Utilizador, Perfil e Organização.
- ROAD-003: evolução Multi-Tenant por Empresa.
- ROAD-004: amadurecimento do Cockpit Executivo, Dashboard e Business Intelligence.
- ROAD-005: governação de logs, auditoria e observabilidade.

## 10. Conclusão

Este documento é a principal referência técnica da arquitetura da plataforma OSFlow.

Qualquer nova funcionalidade deverá respeitar esta arquitetura antes de ser implementada, incluindo decisões de interface, modelação de dados, segurança, estrutura modular, permissões, evolução SaaS e documentação técnica.

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
| --- | --- | --- | --- |
| 1.0.0 | 2026-07-03 | Engenharia da Plataforma OSFlow | Consolidação da arquitetura oficial com padronização documental, nomenclatura e referências cruzadas. |

## Próximas Revisões

- Detalhar arquitetura do Cockpit Executivo, Agenda e Business Intelligence em documentos dedicados.
- Evoluir o catálogo de módulos com dependências, interfaces e ownership técnico.
- Atualizar as decisões arquitetónicas conforme novas sprints forem aprovadas.
