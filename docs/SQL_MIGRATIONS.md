# SQL MIGRATIONS

## Objetivo
Estabelecer este documento como o repositório oficial de todas as migrações SQL da plataforma OSFlow, centralizando o histórico estrutural da base de dados e a preparação das futuras alterações.

## Última revisão
2026-07-04

## Versão do documento
1.1.0

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
| DB-005 |  | Auditoria | Registo de Login, Logout, Alteração de permissões, Criação de Utilizadores, Eliminação e Eventos críticos. | 🟢 Executada |  | 0.9.0 Beta | Registar referência do script quando disponível. | Registo de logs operacionais e rastreabilidade já em utilização na plataforma. |

## 4. Migrações Pendentes

| ID | Data | Título | Descrição | Estado | Responsável | Versão | Script SQL | Observações |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  | 🟡 Pendente |  |  |  |  |

## 5. Migrações Planeadas

| ID | Data | Título | Descrição | Estado | Responsável | Versão | Script SQL | Observações |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DB-003 |  | Preparação SaaS | Preparação dos campos `empresa_id`, `role_id`, `departamento_id`, `equipa_id` e `supervisor_id`. | 🔵 Planeada |  |  | Documentar antes da execução. | Base estrutural para isolamento organizacional e Multi-Tenant. |
| DB-004 |  | Sessões de Utilizador | Criação da tabela `user_sessions` com registo de IP, User Agent, Dispositivo, Login, Logout e Última atividade. | 🔵 Planeada |  |  | Documentar antes da execução. | Preparação da camada de sessão e auditoria operacional. |
| DB-006 |  | Perfis | Tabela de Perfis com ligação por `role_id`. | 🔵 Planeada |  |  | Documentar antes da execução. | Preparação da separação entre Utilizador, permissões e perfis. |
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
| 1.1.0 | 2026-07-04 | Engenharia da Plataforma OSFlow | Atualização do estado das migrações para a versão 0.9.0 Beta, marcando como executadas as migrações efetivamente já refletidas na plataforma. |
| 1.0.0 | 2026-07-03 | Engenharia da Plataforma OSFlow | Consolidação do repositório oficial de migrações SQL com padronização documental e reorganização por estado. |

## Próximas Revisões

- Preencher datas, responsáveis, versões e referência de script SQL à medida que novas migrações forem aprovadas.
- Relacionar cada migração com sprint, decisão técnica e módulo impactado.
- Acrescentar histórico de execução quando houver entrada de novas migrações.
