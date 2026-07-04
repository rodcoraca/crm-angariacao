# SAAS

## Objetivo
Documentar a direção oficial da OSFlow no contexto SaaS, incluindo arquitetura Multi-Tenant, isolamento por Empresa, planos, assinaturas, provisionamento e pagamentos.

## Última revisão
2026-07-03

## Versão do documento
1.0.0

## Responsável
Engenharia da Plataforma OSFlow

## Identificador do documento
DOC-007

## Documentos Relacionados
- [INDEX.md](./INDEX.md)
- [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)
- [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)
- [ROADMAP.md](./ROADMAP.md)
- [DECISIONS.md](./DECISIONS.md)

## Índice
- 1. Visão SaaS
- 2. Arquitetura Multi-Tenant
- 3. Isolamento por Empresa
- 4. Planos e Assinaturas
- 5. Provisionamento
- 6. Pagamentos
- 7. Evoluções Futuras
- 8. Conclusão
- Histórico de Revisões
- Próximas Revisões

## Conteúdo

## 1. Visão SaaS

A OSFlow deverá evoluir para modelo SaaS, mantendo a Plataforma Operacional preparada para múltiplas Empresas com isolamento de dados, autenticação consistente e governação estrutural compatível com crescimento comercial.

## 2. Arquitetura Multi-Tenant

As seguintes diretrizes são oficiais:

- SAAS-001: a arquitetura será Multi-Tenant.
- SAAS-002: o tenant base será a Empresa.
- SAAS-003: o isolamento de dados deverá ser garantido por Empresa.
- SAAS-004: Utilizadores, Agentes, Leads, Imóveis e Documentos deverão permanecer segregados por Empresa.

Estas diretrizes decorrem diretamente da decisão DEC-007.

## 3. Isolamento por Empresa

Cada Empresa deverá possuir contexto próprio para:

- Utilizadores;
- Agentes;
- Clientes;
- Leads;
- Imóveis;
- Documentos.

O modelo de dados deve ser preparado para incorporar `empresa_id` nas estruturas em que o isolamento seja obrigatório.

## 4. Planos e Assinaturas

As estruturas futuras previstas são:

- SAAS-005: Planos SaaS.
- SAAS-006: Assinaturas.
- SAAS-007: ciclo de pagamento e renovação.

Os planos previstos incluem:

- Starter
- Professional
- Enterprise

## 5. Provisionamento

O provisionamento deverá prever criação controlada de Empresa, configuração inicial de contexto, associação de Utilizadores e ativação do plano contratado.

## 6. Pagamentos

A camada de pagamentos deverá ser preparada para suportar cobrança recorrente, reconciliação e integração futura com Stripe.

## 7. Evoluções Futuras

As seguintes frentes já ficam apontadas para documentação futura:

- SAAS-008: Stripe.
- SAAS-009: Portal Cliente.
- SAAS-010: API da plataforma.

Estas frentes possuem referência inicial neste documento, mas ainda exigem documentação dedicada.

## 8. Conclusão

Este documento estabelece a direção oficial da OSFlow para SaaS e deve orientar qualquer decisão estrutural relacionada com Empresa, isolamento de dados, planos, assinaturas e provisionamento.

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
| --- | --- | --- | --- |
| 1.0.0 | 2026-07-03 | Engenharia da Plataforma OSFlow | Consolidação da estratégia SaaS com arquitetura Multi-Tenant, isolamento por Empresa e roadmap de evolução. |

## Próximas Revisões

- Detalhar lifecycle de provisionamento por Empresa.
- Documentar integrações de pagamentos e Stripe.
- Criar documentação dedicada para Portal Cliente e API.
