# RC1.4 – Arquitetura de Performance e Escalabilidade do OSFlow

**Versão:** Draft 2.0  
**Projeto:** OSFlow CRM  
**Estado:** Arquitetura Proposta  
**Autor:** Equipa OSFlow  
**Objetivo:** Definir a arquitetura de dados, sincronização e consulta para suportar crescimento contínuo do volume de leads, múltiplos providers e múltiplas empresas sem degradação significativa de desempenho.

---

# 1. Introdução

O crescimento do volume de dados observado durante a Beta demonstrou que a arquitetura atual cumpre os requisitos funcionais, porém necessita evoluir para suportar escalabilidade de longo prazo.

Em aproximadamente quinze dias, apenas um provider originou mais de **6.000 leads monitorizadas**.

Este comportamento valida o produto, mas também evidencia que alguns componentes deverão ser desacoplados antes da disponibilização SaaS.

O objetivo deste documento é definir a arquitetura de referência para os próximos ciclos de desenvolvimento.

---

# 2. Objetivos

A arquitetura RC1.4 deverá garantir:

- Escalabilidade horizontal
- Baixa latência
- Consultas previsíveis
- Baixo consumo de recursos Supabase
- Separação entre processamento e apresentação
- Facilidade de manutenção
- Preparação para múltiplos providers
- Preparação para múltiplas empresas

---

# 3. Princípios Arquiteturais

## 3.1 O Banco de Dados deve trabalhar

Todo processamento pesado deverá ocorrer no PostgreSQL.

Exemplos:

- COUNT
- SUM
- AVG
- MAX
- GROUP BY
- Views
- Materialized Views
- RPC

O Frontend nunca deverá calcular KPIs.

---

## 3.2 A Interface nunca consulta tabelas operacionais

As tabelas operacionais existem para:

- sincronização
- histórico
- auditoria

A interface deverá consumir:

- snapshots
- views
- consultas resumidas

---

## 3.3 Cada camada possui apenas uma responsabilidade

Sincronização

↓

Persistência

↓

Processamento

↓

Apresentação

Cada camada deverá conhecer apenas a imediatamente inferior.

---

## 3.4 Atualizações Incrementais

Toda sincronização deverá trabalhar apenas sobre diferenças.

Nunca reprocessar toda a tabela quando apenas poucos registros sofreram alteração.

---

# 4. Arquitetura Geral

```text
                        PROVIDERS

        Imovirtual     OLX     Idealista
                │        │         │
                └────────┴─────────┘
                         │
                         ▼

                provider_registry
          (Estado da sincronização)

                         │
                         ▼

                provider_leads
          (Dados operacionais)

                         │
              Processamento interno
                         │

        ┌────────────────┼─────────────────┐
        ▼                ▼                 ▼

      leads      radar_snapshot      analytics

        │                │                 │
        └────────────────┴─────────────────┘

                     Frontend
```

---

# 5. Modelo Físico de Dados

## provider_registry

Responsável pelo estado da sincronização.

Campos principais:

- empresa_id
- provider
- enabled
- sync_running
- last_execution
- next_execution
- interval_minutes
- total_runs

Nunca deverá ser utilizado para consultas da interface.

---

## provider_leads

Tabela operacional.

Responsável por:

- histórico completo
- auditoria
- armazenamento bruto
- diferenças entre sincronizações

Campos relevantes:

- empresa_id
- provider
- provider_lead_id
- hash
- status
- imported
- updated_at
- imported_at
- payload

Nunca deverá alimentar diretamente dashboards.

---

## leads

Tabela comercial.

Representa apenas oportunidades efetivamente trabalhadas.

Não deverá conter histórico técnico do provider.

---

## usuarios

Fonte oficial dos utilizadores do sistema.

Todos os módulos deverão consultar esta tabela.

A antiga tabela **agentes** é considerada descontinuada.

---

## radar_snapshot

Tabela exclusivamente destinada à interface.

Exemplo:

```text
empresa_id

provider

monitorizadas

novas

importadas

ignoradas

expiradas

ultima_atualizacao
```

Toda atualização do Radar deverá ler apenas esta tabela.

---

## analytics (Futuro)

Tabela destinada a indicadores históricos.

Exemplos:

- evolução diária
- conversão
- tempo médio
- tendências

---

# 6. Fluxo de Sincronização

```text
Provider

↓

Receção

↓

Comparação

↓

UPSERT provider_leads

↓

Deteção de diferenças

↓

Atualização Leads

↓

Atualização Snapshot

↓

Refresh Interface
```

---

# 7. Estratégia de Consultas

## Nunca

```sql
SELECT *
FROM provider_leads;
```

---

## Preferir

```sql
SELECT
COUNT(*)
```

ou

```sql
GROUP BY
```

ou

RPC.

O frontend nunca deverá receber milhares de linhas para calcular indicadores.

---

# 8. Paginação

Evitar:

```sql
LIMIT 20
OFFSET 4000;
```

Utilizar Cursor Pagination:

```sql
WHERE updated_at < :cursor
ORDER BY updated_at DESC
LIMIT 20;
```

ou

```sql
WHERE id < :cursor
ORDER BY id DESC
LIMIT 20;
```

---

# 9. Índices Recomendados

## provider_leads

- empresa_id
- provider
- provider_lead_id
- status
- updated_at
- imported_at

---

## leads

- empresa_id
- agente_id
- estado
- created_at

---

## usuarios

- empresa_id
- ativo
- email

---

## radar_snapshot

- empresa_id
- provider

---

# 10. Estratégia de Cache

Manter em memória:

- KPIs
- utilizadores
- configurações
- providers

Invalidar apenas quando:

- sincronização terminar
- empresa mudar
- filtros alterarem resultado

---

# 11. Estratégia de Arquivamento

Após período configurável:

```text
provider_leads

↓

provider_leads_archive
```

A interface deverá consultar apenas registros ativos.

---

# 12. Roadmap Técnico

## RC1.4.1

Revisão completa das consultas SQL.

---

## RC1.4.2

Introdução do Radar Snapshot.

---

## RC1.4.3

Conversão dos KPIs para RPC.

---

## RC1.4.4

Paginação por Cursor.

---

## RC1.4.5

Cache inteligente.

---

## RC1.4.6

Arquivamento automático.

---

## RC1.4.7

Materialized Views.

---

# 13. Plano de Migração RC1.3.3 → RC1.4

## Fase 1 — Baixo Risco

Objetivo:

Eliminar leituras desnecessárias.

### Alterações

- Revisão das consultas SQL
- Índices
- Eliminação de SELECT *
- Remoção definitiva da tabela "agentes"
- Utilização exclusiva da tabela "usuarios"

Impacto esperado:

Nenhum impacto funcional.

---

## Fase 2 — Performance

Objetivo:

Reduzir processamento.

### Alterações

- Introdução de Snapshot
- RPC para KPIs
- Cache de sessão

Impacto esperado:

Carregamento do Cockpit e Radar significativamente mais rápido.

---

## Fase 3 — Escalabilidade

Objetivo:

Preparação para crescimento.

### Alterações

- Cursor Pagination
- Arquivamento automático
- Processamento incremental
- Materialized Views

Impacto esperado:

Suporte para centenas de milhares de leads.

---

## Fase 4 — SaaS

Objetivo:

Preparação Multiempresa.

### Alterações

- Múltiplos Providers
- Processamento paralelo
- Jobs independentes por empresa
- Filas de sincronização

---

# 14. Metas de Desempenho

## Cockpit

Tempo inferior a **500 ms**

---

## Radar

Tempo inferior a **2 segundos**

---

## Sincronização

Até **100.000 leads**

↓

Menos de **5 segundos**

---

## Crescimento

Arquitetura preparada para:

- múltiplos providers
- centenas de milhares de leads
- dezenas de empresas

Sem alterações estruturais.

---

# 15. Riscos Conhecidos

## Alto volume de provider_leads

Mitigação:

Arquivamento.

---

## KPIs calculados no Frontend

Mitigação:

RPC + Snapshot.

---

## OFFSET elevado

Mitigação:

Cursor Pagination.

---

## Leituras repetidas

Mitigação:

Cache de sessão.

---

# 16. Critérios de Aceitação

A arquitetura RC1.4 será considerada concluída quando:

- Nenhuma tela realizar `SELECT *` em tabelas operacionais.
- Todos os KPIs forem obtidos através de agregações SQL ou RPC.
- O Radar utilizar exclusivamente `radar_snapshot`.
- A sincronização operar apenas sobre diferenças.
- Todas as listagens utilizarem paginação por cursor.
- O sistema suportar 100.000 leads por empresa sem degradação significativa de desempenho.
- Todos os módulos utilizarem `usuarios` como fonte única de utilizadores.

---

# 17. Conclusão

A arquitetura RC1.4 representa a transição do OSFlow de uma plataforma funcional para uma plataforma preparada para crescimento.

A separação entre sincronização, armazenamento operacional, dados comerciais e indicadores analíticos reduz o acoplamento do sistema, simplifica futuras evoluções e cria uma base sólida para a fase SaaS.

Esta arquitetura deverá servir como referência para todas as implementações relacionadas com desempenho, sincronização e persistência de dados a partir da RC1.4.

---

# Anexo A — Evolução Arquitetural

```text
RC1.3.x

Provider
     │
     ▼
provider_leads
     │
     ▼
Frontend


RC1.4

Provider
     │
     ▼
provider_leads
     │
     ▼
Processamento
     │
     ├────────► leads
     │
     ├────────► radar_snapshot
     │
     └────────► analytics

                 │
                 ▼

             Frontend
```

---

