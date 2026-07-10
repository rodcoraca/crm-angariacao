# ROADMAP

## Objetivo
Registar a evolução planeada da plataforma OSFlow, consolidando prioridades, entregas e iniciativas futuras da Plataforma Operacional.

## Última revisão
2026-07-10

## Versão do documento
1.2.0

## Responsável
Engenharia da Plataforma OSFlow

## Identificador do documento
DOC-003

## Documentos Relacionados
- [INDEX.md](./INDEX.md)
- [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)
- [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)
- [SAAS.md](./SAAS.md)
- [DECISIONS.md](./DECISIONS.md)

## Índice
- 1. Visão do Roadmap
- 2. Fase Concluída
- 3. Nova Fase
- 4. Próxima Fase
- 5. Backlog
- 6. Longo Prazo
- 7. Validação de Cobertura Documental
- 8. Critérios de Evolução
- 9. Conclusão
- Histórico de Revisões
- Próximas Revisões

## Conteúdo

## 1. Visão do Roadmap

O roadmap da OSFlow organiza a evolução funcional e estrutural da plataforma em frentes priorizadas, alinhadas com arquitetura, segurança, base de dados e preparação SaaS.

## 2. Fase Concluída

| Identificador | Frente | Estado | Objetivo | Documento de referência |
| --- | --- | --- | --- | --- |
| ROAD-000 | Sprint 0 | Concluído | Concluir a base estrutural inicial da plataforma com documentação e direcionamento técnico oficial. | [INDEX.md](./INDEX.md) |
| ROAD-001 | Arquitetura | Concluído | Formalizar e consolidar a arquitetura oficial da Plataforma Operacional OSFlow. | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) |
| ROAD-002 | Design System | Concluído | Consolidar componentes reutilizáveis, padrões visuais e consistência de interface. | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) |
| ROAD-003 | Cockpit Executivo | Concluído | Estruturar e estabilizar a visão executiva da operação. | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) |
| ROAD-004 | KPIs Operacionais | Concluído | Entregar indicadores operacionais para acompanhamento tático. | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) |
| ROAD-005 | Pipeline Comercial | Concluído | Entregar monitorização por etapas do fluxo comercial. | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) |
| ROAD-006 | Centro de Ações | Concluído | Entregar priorização operacional de tarefas imediatas. | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) |
| ROAD-007 | Agenda Operacional | Concluído | Entregar acompanhamento operativo de compromissos e follow-up. | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) |
| ROAD-008 | Índice de Saúde dos Imóveis | Concluído | Entregar controlo de qualidade e completude de informação imobiliária. | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) |

## 3. Nova Fase

| Identificador | Frente | Estado | Objetivo | Documento de referência |
| --- | --- | --- | --- | --- |
| ARCH-001 | Homologação da Arquitetura | Em curso | Validar e homologar o padrão arquitetural oficial para adoção transversal na plataforma. | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) |

## 4. Próxima Fase

| Identificador | Frente | Estado | Objetivo | Documento de referência |
| --- | --- | --- | --- | --- |
| ROAD-009 | Refatoração Utilizadores | Planeado | Consolidar modelo de Utilizador, perfis e preferências com base na arquitetura homologada. | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) |
| ROAD-010 | Segurança | Planeado | Reforçar segurança operacional, auditoria e rastreabilidade da plataforma. | [SECURITY.md](./SECURITY.md) |
| ROAD-011 | Landing Final | Planeado | Finalizar experiência institucional e pública da plataforma. | [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md) |
| ROAD-012 | Beta Pública | Planeado | Preparar a abertura controlada da versão Beta para validação externa. | [ROADMAP.md](./ROADMAP.md) |
| ROAD-013 | SaaS | Planeado | Consolidar capacidades de operação SaaS e isolamento por Empresa. | [SAAS.md](./SAAS.md) |

## 5. Backlog

### BACKLOG-021

Título:
Reativação de React.StrictMode

Descrição:
Reativar React.StrictMode após Beta e tornar todos os hooks totalmente idempotentes.

Objetivos:
- eliminar rerenders duplicados;
- validar compatibilidade React 19;
- rever hooks do Cockpit;
- garantir estabilidade em ambiente de desenvolvimento.

Prioridade:
Baixa

Estado:
Post-Beta

### BACKLOG-022

Título:
Estrutura Organizacional de Utilizadores

Descrição:
Concluir implementação de:

- departamentos;
- equipas;
- supervisores;
- cargos.

Objetivos:
- completar modelo organizacional multiempresa;
- integrar com permissões e filtros.

Prioridade:
Média

Estado:
Após estabilização Beta.

### BACKLOG-023

Título:
Preferências de Utilizador

Descrição:
Implementar tabela e UI de preferências.

Funcionalidades:
- idioma;
- tema;
- página inicial;
- formato de datas;
- notificações.

Prioridade:
Baixa

Estado:
Post-Beta.

### BACKLOG-024

Título:
Regularização e limpeza de dados de utilizadores

Descrição:
Eliminar utilizadores de teste e manter apenas ambiente limpo para produção.

Objetivos:
- remover dados órfãos;
- validar integridade auth.users ↔ usuarios;
- preparar seed inicial de produção.

Prioridade:
Alta

Estado:
Antes da publicação Beta.

### BACKLOG-025

Título:
Melhorias cosméticas e técnicas

Itens:
- corrigir logo192.png;
- corrigir warnings border/borderColor;
- revisão final de warnings React.

Prioridade:
Baixa

Estado:
Pós-Beta.

## 6. Longo Prazo

| Identificador | Frente | Objetivo | Documento de referência |
| --- | --- | --- | --- |
| ROAD-014 | Portal Cliente | Disponibilizar portal por Empresa com autosserviço. | [SAAS.md](./SAAS.md) |
| ROAD-015 | Integração de Pagamentos | Formalizar pagamentos, cobrança e reconciliação. | [SAAS.md](./SAAS.md) |
| ROAD-016 | API da Plataforma | Definir API documental e operacional da Plataforma Operacional. | [SAAS.md](./SAAS.md) |

## 7. Validação de Cobertura Documental

Após validação da fase concluída e da nova fase arquitetural, todas as implementações futuras possuem pelo menos um documento de referência. As seguintes iniciativas ainda não possuem documento dedicado e ficam formalmente apontadas para futura documentação:

- Agenda
- Cockpit Executivo
- Business Intelligence
- Portal Cliente
- API da Plataforma
- Configurações

## 8. Critérios de Evolução

- Toda iniciativa futura deve possuir identificador oficial antes de entrar no roadmap.
- Toda iniciativa estrutural deve possuir ligação a decisão, documento e migração SQL quando aplicável.
- Toda evolução SaaS deve considerar isolamento por Empresa desde a origem.

## 9. Conclusão

O roadmap oficial da OSFlow deve ser lido em conjunto com a arquitetura, as decisões técnicas, a segurança e as migrações SQL, garantindo coerência entre planeamento e execução.

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
| --- | --- | --- | --- |
| 1.2.0 | 2026-07-10 | Engenharia da Plataforma OSFlow | Atualização do backlog com registo dos itens BACKLOG-021 a BACKLOG-025 e atualização do índice do roadmap. |
| 1.1.0 | 2026-07-04 | Engenharia da Plataforma OSFlow | Atualização do roadmap com frentes concluídas, inclusão da fase ARCH-001 Homologação da Arquitetura e definição da próxima fase. |
| 1.0.0 | 2026-07-03 | Engenharia da Plataforma OSFlow | Consolidação do roadmap oficial com prioridades, referências cruzadas e apontamentos documentais futuros. |

## Próximas Revisões

- Detalhar critérios de entrada e saída por sprint.
- Acrescentar dependências entre frentes ROAD-xxx e decisões DEC-xxx.
- Criar documentos dedicados para módulos ainda sem documentação própria.
