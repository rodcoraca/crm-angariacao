# RELEASE PLAN

## Objetivo
Definir o plano oficial de versões da plataforma OSFlow, incluindo estado, objetivos, funcionalidades principais, critérios de conclusão e direção de evolução entre versões.

## Última revisão
2026-07-04

## Versão do documento
1.0.0

## Responsável
Engenharia da Plataforma OSFlow

## Identificador do documento
ROAD-009

## Documentos Relacionados
- [INDEX.md](./INDEX.md)
- [ROADMAP.md](./ROADMAP.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md)
- [DECISIONS.md](./DECISIONS.md)
- [SAAS.md](./SAAS.md)

## Índice
- 1. Plano de Releases
- 2. Conclusão
- Histórico de Revisões
- Próximas Revisões

## Conteúdo

## 1. Plano de Releases

### v0.9.0 Beta

**Versão**
- v0.9.0 Beta

**Estado**
- Beta Interna

**Objetivos**
- Consolidar o Cockpit Executivo como módulo operacional principal.
- Estabilizar a arquitetura por camadas no frontend do CRM.
- Validar consistência visual e estrutural do Design System.

**Principais funcionalidades**
- Cockpit Executivo.
- KPIs Operacionais.
- Pipeline Comercial.
- Centro de Ações.
- Agenda Operacional.
- Índice de Saúde dos Imóveis.
- Nova arquitetura por camadas.
- Design System consolidado.
- Documentação técnica consolidada.
- Preparação inicial para SaaS.

**Critérios de conclusão**
- Cockpit funcional com dados operacionais carregados sem regressões críticas.
- Estrutura UI, Hooks, Services e ViewModels aplicada no módulo Cockpit.
- Build de produção concluída com sucesso.
- Documentação de arquitetura e changelog atualizados.

**Roadmap da próxima versão**
- Evoluir para v0.9.1 Beta com foco em robustez operacional e governança de arquitetura.

### v0.9.1 Beta

**Versão**
- v0.9.1 Beta

**Estado**
- Planeada

**Objetivos**
- Refinar padronização arquitetural entre módulos do CRM.
- Reduzir duplicação de lógica em consultas e composição de dados.
- Preparar validações estruturais para transição estável à versão 1.0.0.

**Principais funcionalidades**
- Hardening da arquitetura por camadas (UI, Hooks, Services, ViewModels).
- Normalização de contratos entre secções do Cockpit.
- Melhorias de observabilidade operacional e consistência de estados.
- Consolidação de padrões para expansão modular do CRM.

**Critérios de conclusão**
- Redução mensurável de duplicação técnica em fluxos críticos do Cockpit.
- Contratos de dados estáveis entre secções e componentes.
- Auditoria técnica sem bloqueadores críticos de arquitetura.
- Documentação de evolução atualizada com rastreabilidade.

**Roadmap da próxima versão**
- Evoluir para v1.0.0 com foco em baseline de produção e readiness SaaS.

### v1.0.0

**Versão**
- v1.0.0

**Estado**
- Planeada

**Objetivos**
- Estabelecer baseline oficial de produção da plataforma OSFlow.
- Garantir maturidade técnica, estabilidade funcional e governança documental.
- Formalizar prontidão para operação SaaS com isolamento por Empresa.

**Principais funcionalidades**
- Cockpit Executivo em baseline de produção.
- Arquitetura modular consolidada e validada por critérios oficiais.
- Camada de dados preparada para contexto Multi-Tenant.
- Processo de release e documentação técnica institucionalizados.

**Critérios de conclusão**
- Ausência de bloqueadores críticos de arquitetura e segurança.
- Critérios de aceite de produção validados pela engenharia da plataforma.
- Conformidade com decisões arquiteturais oficiais.
- Planeamento de versões pós-1.0 formalizado.

**Roadmap da próxima versão**
- Definir ciclo de releases 1.x com foco em escala, integrações e evolução SaaS.

## 2. Conclusão

Este documento define o plano oficial de versões da OSFlow e deverá ser atualizado de forma cumulativa a cada release aprovado, mantendo rastreabilidade entre objetivos, execução técnica e evolução da plataforma.

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
| --- | --- | --- | --- |
| 1.0.0 | 2026-07-04 | Engenharia da Plataforma OSFlow | Criação do plano oficial de releases com v0.9.0 Beta, v0.9.1 Beta e v1.0.0. |

## Próximas Revisões

- Atualizar estado de cada versão conforme progresso oficial.
- Acrescentar riscos, dependências e critérios quantitativos por release.
- Integrar o plano com marcos de segurança, SaaS e roadmap técnico.
