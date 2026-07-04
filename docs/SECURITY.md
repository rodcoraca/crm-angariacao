# SECURITY

## Objetivo
Consolidar as diretrizes, práticas e decisões oficiais relacionadas com a segurança da plataforma OSFlow, incluindo autenticação, sessões, auditoria e preparação futura para mecanismos reforçados de proteção.

## Última revisão
2026-07-03

## Versão do documento
1.0.0

## Responsável
Engenharia da Plataforma OSFlow

## Identificador do documento
DOC-006

## Documentos Relacionados
- [INDEX.md](./INDEX.md)
- [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)
- [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)
- [SAAS.md](./SAAS.md)
- [DECISIONS.md](./DECISIONS.md)

## Índice
- 1. Escopo
- 2. Princípios Oficiais
- 3. Sessões e Autenticação
- 4. Auditoria e Rastreabilidade
- 5. Registo de IP
- 6. Preparação para 2FA
- 7. Rastreabilidade com SQL
- 8. Conclusão
- Histórico de Revisões
- Próximas Revisões

## Conteúdo

## 1. Escopo

Este documento formaliza a base de segurança da plataforma OSFlow e deve orientar qualquer evolução funcional que envolva Utilizadores, autenticação, sessões, registos de acesso e eventos críticos.

## 2. Princípios Oficiais

As seguintes decisões são oficiais:

- SEC-001: uma única sessão ativa por Utilizador.
- SEC-002: registo de IP por sessão.
- SEC-003: auditoria de acessos.
- SEC-004: histórico de login.
- SEC-005: preparação para 2FA.

Estas decisões são suportadas pela decisão arquitetónica DEC-005 e prevalecem sobre prioridades de velocidade de entrega.

## 3. Sessões e Autenticação

A autenticação pertence ao Utilizador e não ao Agente. A sessão também pertence ao Utilizador e deve manter histórico de criação, atividade e encerramento.

Regras estruturais:

- o acesso deve ser rastreável por Utilizador;
- a política de sessão única deve ser tratada como requisito base;
- o modelo deve estar preparado para registo de dispositivo e User Agent.

## 4. Auditoria e Rastreabilidade

A auditoria deverá contemplar, no mínimo:

- login;
- logout;
- alteração de permissões;
- criação de Utilizadores;
- eliminação;
- eventos críticos.

Os eventos de auditoria deverão possuir histórico persistente e ligação clara ao contexto de acesso.

## 5. Registo de IP

O registo de IP é considerado obrigatório como base de rastreabilidade operacional. A informação deverá ser tratada como parte da camada de segurança e não como dado opcional.

## 6. Preparação para 2FA

A plataforma deve permanecer preparada para introdução futura de 2FA sem necessidade de reestruturação arquitetural profunda. A preparação inclui documentação, modelação e previsão de impacto em autenticação e experiência de acesso.

## 7. Rastreabilidade com SQL

| Identificador | Migração relacionada | Descrição | Estado |
| --- | --- | --- | --- |
| SEC-001 | DB-004 | Sessão única por Utilizador e controlo operacional de sessão. | Planeada |
| SEC-002 | DB-004 | Registo de IP por sessão. | Planeada |
| SEC-003 | DB-005 | Auditoria de acessos e eventos críticos. | Planeada |
| SEC-004 | DB-004 | Histórico de login e logout. | Planeada |
| SEC-005 | DB-006 | Preparação estrutural para reforço de autenticação. | Planeada |

## 8. Conclusão

Este documento é a referência oficial de segurança da OSFlow e deve ser consultado antes de qualquer evolução relacionada com Utilizador, acesso, sessões ou proteção de dados operacionais.

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
| --- | --- | --- | --- |
| 1.0.0 | 2026-07-03 | Engenharia da Plataforma OSFlow | Consolidação da documentação de segurança com decisões oficiais, rastreabilidade e alinhamento arquitetural. |

## Próximas Revisões

- Detalhar matriz de permissões por Perfil.
- Formalizar política de retenção de logs e auditoria.
- Acrescentar requisitos funcionais para 2FA e recuperação de acesso.
