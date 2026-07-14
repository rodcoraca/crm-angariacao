# DECISIONS

## Introdução
Este documento constitui o registo oficial de decisões técnicas da plataforma OSFlow. A sua finalidade é preservar, de forma rastreável e padronizada, as decisões estruturais aprovadas que impactam arquitetura, dados, segurança, SaaS, interface e evolução da Plataforma Operacional.

## Objetivo
Registar as decisões técnicas e estruturais aprovadas da plataforma OSFlow, incluindo contexto, motivação, impacto e documentos relacionados.

## Última revisão
2026-07-04

## Versão do documento
1.1.0

## Responsável
Engenharia da Plataforma OSFlow

## Identificador do documento
DOC-009

## Documentos Relacionados
- [INDEX.md](./INDEX.md)
- [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)
- [SECURITY.md](./SECURITY.md)
- [SAAS.md](./SAAS.md)
- [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)

## Índice
- 1. Âmbito das Decisões
- 2. Regras para Criação de Novas Decisões
- 3. Estrutura Padrão de uma Decisão Técnica
- 4. Tabela de Decisões
- 5. Índice de Decisões
- 6. Decisões Aprovadas
- 7. Impacto Arquitetural
- 8. Conclusão
- Histórico de Revisões
- Próximas Revisões

## Conteúdo

## 1. Âmbito das Decisões

Este documento aplica-se a decisões técnicas e estruturais que afetem a plataforma OSFlow em qualquer um dos seguintes domínios:

- arquitetura da Plataforma Operacional;
- organização modular;
- modelo de Utilizador e Agente;
- base de dados e migrações SQL;
- segurança, auditoria e sessões;
- preparação SaaS e isolamento por Empresa;
- Design System, UI e consistência de interface.

## 2. Regras para Criação de Novas Decisões

Toda nova decisão técnica deverá respeitar as seguintes regras:

- utilizar identificador único no formato `DEC-XXX`;
- possuir título claro e estável;
- registar estado da decisão;
- informar data de aprovação ou atualização;
- indicar a versão da plataforma a que a decisão se refere;
- identificar responsável pela decisão;
- documentar contexto, decisão, justificação e impacto;
- referenciar os documentos relacionados;
- manter observações quando existirem dependências, substituições ou notas operacionais.

## 3. Estrutura Padrão de uma Decisão Técnica

Cada decisão técnica deverá utilizar o seguinte modelo:

- Identificador (`DEC-XXX`)
- Título
- Estado
- Data
- Versão da plataforma
- Responsável
- Contexto
- Decisão
- Justificação
- Impacto
- Documentos Relacionados
- Observações

## 4. Tabela de Decisões

| ID | Título | Data | Estado | Documento relacionado |
| --- | --- | --- | --- | --- |
| DEC-001 | OSFlow como Plataforma Operacional | 2026-07-03 | Aprovada | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) |
| DEC-002 | Fonte única de verdade para os dados | 2026-07-03 | Aprovada | [DATABASE.md](./DATABASE.md) |
| DEC-003 | Separação entre UI, lógica e dados | 2026-07-03 | Aprovada | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) |
| DEC-004 | Modelo de Utilizador e Agente | 2026-07-03 | Aprovada | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) |
| DEC-005 | Segurança antes de novas funcionalidades | 2026-07-03 | Aprovada | [SECURITY.md](./SECURITY.md) |
| DEC-006 | Documentação obrigatória de alterações estruturais | 2026-07-03 | Aprovada | [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md) |
| DEC-007 | Preparação permanente para SaaS | 2026-07-03 | Aprovada | [SAAS.md](./SAAS.md) |
| DEC-008 | Design System com componentes reutilizáveis | 2026-07-03 | Aprovada | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) |
| DEC-019 | Arquitetura Oficial por Camadas | 2026-07-04 | Aprovada | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) |

## 5. Índice de Decisões

- [DEC-001 - OSFlow como Plataforma Operacional](#dec-001---osflow-como-plataforma-operacional)
- [DEC-002 - Fonte única de verdade para os dados](#dec-002---fonte-unica-de-verdade-para-os-dados)
- [DEC-003 - Separação entre UI, lógica e dados](#dec-003---separacao-entre-ui-logica-e-dados)
- [DEC-004 - Modelo de Utilizador e Agente](#dec-004---modelo-de-utilizador-e-agente)
- [DEC-005 - Segurança antes de novas funcionalidades](#dec-005---seguranca-antes-de-novas-funcionalidades)
- [DEC-006 - Documentação obrigatória de alterações estruturais](#dec-006---documentacao-obrigatoria-de-alteracoes-estruturais)
- [DEC-007 - Preparação permanente para SaaS](#dec-007---preparacao-permanente-para-saas)
- [DEC-008 - Design System com componentes reutilizáveis](#dec-008---design-system-com-componentes-reutilizaveis)
- [DEC-019 - Arquitetura Oficial por Camadas](#dec-019---arquitetura-oficial-por-camadas)

## 6. Decisões Aprovadas

### DEC-001 - OSFlow como Plataforma Operacional

- Identificador: `DEC-001`
- Título: OSFlow como Plataforma Operacional
- Estado: Aprovada
- Data: 2026-07-03
- Versão da plataforma: 0.1.0
- Responsável: Engenharia da Plataforma OSFlow
- Contexto: Era necessário formalizar o posicionamento estrutural da OSFlow para evitar que o CRM fosse tratado como a totalidade da solução.
- Decisão: A OSFlow é uma Plataforma Operacional para Imobiliárias. O CRM é um módulo desta plataforma e não a totalidade da solução.
- Justificação: A decisão cria uma base arquitetural comum para evolução modular, roadmap, dados, segurança e SaaS.
- Impacto: Orienta a arquitetura, o roadmap e a organização dos módulos da plataforma.
- Documentos Relacionados: [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md), [INDEX.md](./INDEX.md)
- Observações: Decisão fundacional da documentação arquitetural da Sprint 0.

### DEC-002 - Fonte única de verdade para os dados

- Identificador: `DEC-002`
- Título: Fonte única de verdade para os dados
- Estado: Aprovada
- Data: 2026-07-03
- Versão da plataforma: 0.1.0
- Responsável: Engenharia da Plataforma OSFlow
- Contexto: Era necessário definir uma regra estrutural para evitar duplicação de informação crítica e inconsistência entre módulos.
- Decisão: Nenhum dado estrutural deverá possuir duplicação sem necessidade. Cada informação crítica deverá ter uma única fonte de verdade.
- Justificação: A decisão reduz redundância, conflitos de atualização e ambiguidade sobre ownership dos dados.
- Impacto: Afeta modelação de base de dados, integrações, fluxos entre módulos e futuras migrações SQL.
- Documentos Relacionados: [DATABASE.md](./DATABASE.md), [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)
- Observações: Deve ser considerada em qualquer alteração de entidades ou relacionamentos.

### DEC-003 - Separação entre UI, lógica e dados

- Identificador: `DEC-003`
- Título: Separação entre UI, lógica e dados
- Estado: Aprovada
- Data: 2026-07-03
- Versão da plataforma: 0.1.0
- Responsável: Engenharia da Plataforma OSFlow
- Contexto: Era necessário fixar um princípio estrutural que impedisse acoplamento excessivo entre interface, regras de negócio e acesso aos dados.
- Decisão: A arquitetura deverá manter separação entre interface, lógica de negócio e acesso aos dados, privilegiando componentes reutilizáveis.
- Justificação: A decisão melhora manutenção, escalabilidade e clareza entre responsabilidades técnicas.
- Impacto: Influencia arquitetura frontend, organização de módulos e evolução do Design System.
- Documentos Relacionados: [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md)
- Observações: Está alinhada com a padronização de UI e componentes reutilizáveis.

### DEC-004 - Modelo de Utilizador e Agente

- Identificador: `DEC-004`
- Título: Modelo de Utilizador e Agente
- Estado: Aprovada
- Data: 2026-07-03
- Versão da plataforma: 0.1.0
- Responsável: Engenharia da Plataforma OSFlow
- Contexto: Era necessário separar identidade, acesso e função comercial para evitar confusão estrutural no modelo da plataforma.
- Decisão: Utilizador representa uma pessoa. Agente representa função comercial. Nem todo Utilizador é Agente. Permissões, perfil, sessão e autenticação pertencem ao Utilizador.
- Justificação: A decisão preserva clareza entre identidade, autenticação, autorização e função operacional.
- Impacto: Afeta modelo de dados, segurança, permissões, sessões e futuras migrações ligadas a perfis e organização.
- Documentos Relacionados: [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md), [DATABASE.md](./DATABASE.md)
- Observações: Relaciona-se diretamente com as migrações DB-002, DB-004 e DB-006.

### DEC-005 - Segurança antes de novas funcionalidades

- Identificador: `DEC-005`
- Título: Segurança antes de novas funcionalidades
- Estado: Aprovada
- Data: 2026-07-03
- Versão da plataforma: 0.1.0
- Responsável: Engenharia da Plataforma OSFlow
- Contexto: Era necessário definir que a evolução funcional não poderia comprometer a base de segurança da plataforma.
- Decisão: A plataforma deverá priorizar segurança antes de expansão funcional, incluindo sessão única, registo de IP, auditoria, histórico de login e preparação para 2FA.
- Justificação: A decisão protege a rastreabilidade operacional e reduz risco estrutural em autenticação e acessos.
- Impacto: Afeta requisitos de sessão, auditoria, segurança de Utilizador e prioridades do roadmap técnico.
- Documentos Relacionados: [SECURITY.md](./SECURITY.md), [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)
- Observações: Sustenta os identificadores SEC-001 a SEC-005 já documentados.

### DEC-006 - Documentação obrigatória de alterações estruturais

- Identificador: `DEC-006`
- Título: Documentação obrigatória de alterações estruturais
- Estado: Aprovada
- Data: 2026-07-03
- Versão da plataforma: 0.1.0
- Responsável: Engenharia da Plataforma OSFlow
- Contexto: Era necessário formalizar um controlo documental prévio para evitar alterações estruturais sem histórico ou rastreabilidade.
- Decisão: Toda alteração estrutural e toda migração SQL deverá ser documentada antes da implementação, preservando histórico e rastreabilidade.
- Justificação: A decisão garante governança técnica, histórico documental e coerência entre planeamento e execução.
- Impacto: Afeta arquitetura, base de dados, migrações SQL, changelog e processo de evolução da plataforma.
- Documentos Relacionados: [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md), [INDEX.md](./INDEX.md), [CHANGELOG.md](./CHANGELOG.md)
- Observações: É a decisão que legitima a própria consolidação documental da Sprint 0.

### DEC-007 - Preparação permanente para SaaS

- Identificador: `DEC-007`
- Título: Preparação permanente para SaaS
- Estado: Aprovada
- Data: 2026-07-03
- Versão da plataforma: 0.1.0
- Responsável: Engenharia da Plataforma OSFlow
- Contexto: Era necessário garantir que a plataforma evolui desde já preparada para operação SaaS e isolamento por Empresa.
- Decisão: A plataforma deverá permanecer preparada para arquitetura Multi-Tenant, com isolamento por Empresa desde a base documental e estrutural.
- Justificação: A decisão evita retrabalho estrutural e antecipa necessidades de escalabilidade comercial e técnica.
- Impacto: Afeta arquitetura, base de dados, organização por Empresa, planos, assinaturas e provisionamento.
- Documentos Relacionados: [SAAS.md](./SAAS.md), [DATABASE.md](./DATABASE.md), [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md)
- Observações: Relaciona-se diretamente com as migrações DB-003, DB-007, DB-008 e DB-009.

### DEC-008 - Design System com componentes reutilizáveis

- Identificador: `DEC-008`
- Título: Design System com componentes reutilizáveis
- Estado: Aprovada
- Data: 2026-07-03
- Versão da plataforma: 0.1.0
- Responsável: Engenharia da Plataforma OSFlow
- Contexto: Era necessário formalizar uma base visual e estrutural consistente para evitar fragmentação da UI.
- Decisão: O Design System deverá ser sustentado por componentes reutilizáveis, tokens, theme, tipografia e paleta consistente.
- Justificação: A decisão promove consistência de interface, reutilização e previsibilidade de implementação.
- Impacto: Afeta componentes de UI, padrão visual, manutenção do frontend e evolução do Design System.
- Documentos Relacionados: [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md)
- Observações: Relaciona-se com os identificadores UI-001 a UI-005 documentados na arquitetura.

### DEC-019 - Arquitetura Oficial por Camadas

- Identificador: `DEC-019`
- Título: Arquitetura Oficial por Camadas
- Estado: Aprovada
- Data: 2026-07-04
- Versão da plataforma: 0.9.0 Beta
- Responsável: Engenharia da Plataforma OSFlow
- Contexto: Era necessário formalizar um padrão arquitetural único para todos os módulos, reduzindo acoplamento entre interface, estado, acesso a dados e transformação de dados.
- Decisão: Todos os módulos da plataforma deverão seguir obrigatoriamente a arquitetura:
	- Componentes
	- Hooks
	- Services
	- ViewModels
	- Supabase
- Justificação: A decisão cria um padrão estável para escalabilidade, manutenção e governança técnica entre módulos do CRM e demais módulos da Plataforma Operacional.
- Impacto: Uniformiza responsabilidades técnicas por camada, reduz dependência direta da interface com origem de dados e facilita auditoria arquitetural.
- Documentos Relacionados: [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md), [SAAS.md](./SAAS.md), [INDEX.md](./INDEX.md)
- Observações:
	- Componentes apenas apresentam dados.
	- Hooks controlam estado.
	- Services comunicam com a origem de dados.
	- ViewModels transformam dados.
	- Nenhum componente poderá consultar diretamente o Supabase.
	- O Cockpit Executivo é o primeiro módulo implementado segundo este padrão.

## 7. Impacto Arquitetural

As decisões aprovadas impactam diretamente:

- arquitetura modular;
- base de dados e migrações SQL;
- segurança e sessões;
- preparação SaaS;
- consistência de UI;
- evolução do roadmap.

## 8. Conclusão

Este documento é a fonte oficial das decisões técnicas aprovadas da OSFlow e deve ser consultado antes de qualquer mudança estrutural relevante.

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
| --- | --- | --- | --- |
| 1.1.0 | 2026-07-04 | Engenharia da Plataforma OSFlow | Inclusão da DEC-019 Arquitetura Oficial por Camadas e formalização do Cockpit Executivo como primeiro módulo no padrão por camadas. |
| 1.0.0 | 2026-07-03 | Engenharia da Plataforma OSFlow | Consolidação do registo oficial de decisões técnicas com identificadores normalizados e referências cruzadas. |

DEC-00X - Estrutura oficial de domínios

Status: Aprovado
Data: 13/07/2026

www.osflow.pt      -> Landing institucional
app.osflow.pt      -> Aplicação principal
api.osflow.pt      -> APIs e integrações
docs.osflow.pt     -> Documentação
status.osflow.pt   -> Monitorização futura
admin.osflow.pt    -> Administração SaaS futura

Justificação:
Preparação antecipada para evolução SaaS, separação de responsabilidades,
escalabilidade e redução de futuras migrações.

## Próximas Revisões

- Acrescentar contexto, trade-offs e impactos por decisão futura.
- Relacionar cada decisão com sprint, módulo e migração SQL aplicável.
- Evoluir o histórico conforme novas decisões forem aprovadas.
