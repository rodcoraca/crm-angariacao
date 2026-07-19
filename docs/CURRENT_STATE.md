# OSFLOW CURRENT STATE

Última atualização: Julho 2026

## Estado Geral

Fase atual:
Pré-Beta avançado / Estabilização final.

Objetivo atual:
Correção de regressões, melhorias operacionais e preparação para utilização comercial.

---

# PRINCÍPIOS OBRRIGATÓRIOS

* Não realizar refactors extensos sem necessidade.
* Diagnóstico → Impacto → Implementação mínima.
* Não alterar layouts sem solicitação explícita.
* Todos os módulos devem respeitar empresa_id.
* Todo módulo deve possuir autenticação, autorização e auditoria.
* Gestão de permissões permanece exclusivamente no módulo Utilizadores.

---

# ESTADO DOS MÓDULOS

## Cockpit

Status: Finalizado.

Pendências:

* Bug intermitente onde o menu deixa de responder aleatoriamente.

Prioridade:
Média.

---

## Radar

Status: Finalizado.

Provider em produção:

* Imovirtual operacional.

Melhorias futuras:

### Filtro de Importação Inteligente

Objetivo:
Permitir que cada utilizador defina filtros antes da sincronização.

Filtros previstos:

* Distritos pretendidos
* Apenas particulares
* Excluir particulares
* Tipologias futuras
* Outros critérios futuros

Funcionamento:

O sistema deverá consultar apenas oportunidades relevantes para o utilizador, reduzindo:

* tempo de sincronização;
* carga no provider;
* processamento interno;
* ruído comercial.

Necessário:
Criar preferências persistidas por utilizador com possibilidade de alteração manual.

Prioridade:
Alta.

---

## Fluxo

Status: Finalizado.

Bug crítico:

### Copiloto Comercial

Problema:
O fluxo não avança corretamente e retorna para a primeira etapa.

Classificação:
Regressão.

Prioridade:
Alta.

---

## Leads

Status:
Aprovado para esta versão.

Pendências:
Nenhuma crítica.

---

## Mensagens

Status:
Aprovado para esta versão.

---

## Empresas

Status:
Aprovado para esta versão.

---

## Documentos

Status:
Aprovado para esta versão.

---

## Utilizadores

Status:
Aprovado para esta versão.

Melhorias futuras:

### Auditoria Expandida

Atualmente gravado:

* login
* logout
* entradas de páginas
* saídas de páginas

Objetivo:

Capturar todas as ações do sistema:

* criar
* editar
* eliminar
* importar
* exportar
* alterar permissões
* alterar configurações
* sincronizações
* alterações administrativas
* alterações de estado
* qualquer ação crítica.

Necessário:

Implementar sistema de auditoria transacional completo.

Prioridade:
Alta.

---

# PROVIDERS

Estado:
Imovirtual operacional.

Arquitetura atual:
provider_registry como fonte única de verdade.

Objetivos futuros:

* novas integrações;
* filtros inteligentes;
* monitorização;
* histórico de sincronizações.

---

# SAAS

Estado:
Ainda não iniciado.

Decisão:
Finalizar estabilização dos módulos antes de iniciar arquitetura SaaS definitiva.

---

# BETA

Situação:

Muito próximo.

Objetivo imediato:

1. Corrigir regressões.
2. Melhorar experiência operacional.
3. Estabilizar auditoria.
4. Validar sincronizações.
5. Preparar demonstrações comerciais.
