# CHANGELOG

## Objetivo
Manter um histórico oficial e organizado das mudanças relevantes da plataforma OSFlow, incluindo marcos documentais, estruturais e evolutivos da Plataforma Operacional.

## Última revisão
2026-07-06

## Versão do documento
1.2.0

## Responsável
Engenharia da Plataforma OSFlow

## Identificador do documento
DOC-008

## Documentos Relacionados
- [INDEX.md](./INDEX.md)
- [ROADMAP.md](./ROADMAP.md)
- [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md)
- [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)
- [DECISIONS.md](./DECISIONS.md)

## Índice
- 1. Convenção de Registo
- 2. Esquema de Versão
- 3. Histórico Oficial
- 4. Categorias de Alteração
- 5. Conclusão
- Histórico de Revisões
- Próximas Revisões

## Conteúdo

## 1. Convenção de Registo

O changelog da OSFlow deve registar alterações relevantes de arquitetura, documentação, segurança, base de dados e roadmap. Alterações puramente estruturais de documentação da Sprint 0 são consideradas válidas neste histórico por definirem a referência oficial da plataforma.

## 2. Esquema de Versão

O histórico deve utilizar versionamento coerente com a maturidade da plataforma e com o tipo de alteração registada. O identificador documental poderá ser associado a iniciativas `DOC-xxx`, `DEC-xxx`, `DB-xxx`, `SEC-xxx`, `SAAS-xxx` e `ROAD-xxx`.

## 3. Histórico Oficial

| Versão | Data | Identificador | Tipo | Descrição |
| --- | --- | --- | --- | --- |
| 0.9.1 Beta | 2026-07-06 | CRM-005 | Arquitetura | Homologação do domínio Imóveis para padrão por camadas em `src/modules/imoveis` (repositories, services, hooks, viewmodels e utils), com migração do container `EstoqueNaoPublicitado` para orquestração sem alteração de layout, regras de negócio, comportamento funcional, Cockpit ou módulo Documentos. |
| 0.9.0 Beta | 2026-07-04 | CRM-004 | Release | OSFlow v0.9.0 Beta (Estado: Beta Interna) com Cockpit Executivo, KPIs Operacionais, Pipeline Comercial, Centro de Ações, Agenda Operacional, Índice de Saúde dos Imóveis, nova arquitetura por camadas, Design System consolidado, documentação técnica e preparação para SaaS. |
| 0.1.0 | 2026-07-03 | DOC-001 | Documentação | Consolidação da documentação oficial da Sprint 0 e criação do índice principal da plataforma. |
| 0.1.0 | 2026-07-03 | DOC-002 | Arquitetura | Formalização da arquitetura oficial da Plataforma Operacional OSFlow. |
| 0.1.0 | 2026-07-03 | DOC-005 | Base de Dados | Estruturação do repositório oficial de migrações SQL e respetiva rastreabilidade. |
| 0.1.0 | 2026-07-03 | DOC-009 | Decisões | Consolidação das decisões técnicas aprovadas da Sprint 0. |

## RC1.3 - Módulo Utilizadores (Homologado)

Data: 2026-07-10

### Correções e Implementações
- Integração completa entre auth.users e usuarios.
- Implementação e estabilização de user_sessions.
- Registo de login, logout e atividade contínua.
- Implementação de status de sessão: active e closed.
- Correção de persistência de logout_at e last_activity_at.
- Correção de problemas de auth_user_id.
- Correção de erros 400 nas consultas de utilizadores.
- Validação de perfis e RBAC.
- Validação de auditoria e atividade do utilizador.
- Preparação estrutural para departamentos, equipas e cargos.
- Regularização da base de utilizadores para ambiente Beta.

### Decisões Técnicas
- React.StrictMode foi desativado temporariamente para estabilização do ambiente Beta.
- Reativação ficará planeada para backlog pós-Beta.
- Módulo Utilizadores considerado funcionalmente concluído e congelado.

### Estado Final
Status: HOMOLOGADO
Pronto para:
- Integração OLX
- Publicação Beta
- Testes reais

### Versão Oficial Atual

- Versão: OSFlow v0.9.0 Beta
- Data da versão: 2026-07-04
- Estado: Beta Interna

### Principais Funcionalidades Concluídas (v0.9.0 Beta)

- Cockpit Executivo
- KPIs Operacionais
- Pipeline Comercial
- Centro de Ações
- Agenda Operacional
- Índice de Saúde dos Imóveis
- Nova arquitetura por camadas
- Design System consolidado
- Documentação técnica
- Preparação para SaaS

### Próxima Versão Prevista

- v0.9.1 Beta

## RC1.5.2 - Recuperação de Password

Data: 2026-07-13

### Implementação
- Fluxo de recuperação autónoma ativado no login com envio de email via Supabase Auth.
- Utilização explícita de `resetPasswordForEmail` através do serviço `requestPasswordReset`.
- Definição de nova password já suportada no modo `type=recovery` com retorno ao login após sucesso.

### UX e Regras de Negócio
- Botão `Recuperar password` mantido no ecrã de login sem alterações de layout/experiência.
- Feedback visual garantido para:
- `Email de recuperação enviado`.
- `Email inexistente`.
- `Erro` de comunicação/interno ao recuperar password.
- Fluxo de autenticação existente preservado.
- `account_status` preservado sem alterações de estado durante recuperação de password.

### SQL
- Sem alterações SQL para RC1.5.2.

## 4. Categorias de Alteração

- Documentação
- Arquitetura
- Segurança
- Base de Dados
- SaaS
- Roadmap

## 5. Conclusão

Este documento é o histórico oficial de versões da plataforma OSFlow e deverá crescer de forma cumulativa, sem perda de registos anteriores.

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
| --- | --- | --- | --- |
| 1.2.0 | 2026-07-06 | Engenharia da Plataforma OSFlow | Registo de rastreabilidade da homologação arquitetural do domínio Imóveis (CRM-005) sem alteração funcional de layout/regras/comportamento. |
| 1.1.0 | 2026-07-04 | Engenharia da Plataforma OSFlow | Atualização oficial para OSFlow v0.9.0 Beta, incluindo estado Beta Interna, funcionalidades concluídas e previsão da próxima versão v0.9.1 Beta. |
| 1.0.0 | 2026-07-03 | Engenharia da Plataforma OSFlow | Consolidação do changelog oficial com convenção, categorias e histórico inicial da Sprint 0. |

## Próximas Revisões

- Registar futuras versões por sprint e por frente técnica.
- Relacionar versões com decisões técnicas e migrações SQL executadas.
- Incluir marcos de SaaS, segurança e módulos quando forem implementados.
