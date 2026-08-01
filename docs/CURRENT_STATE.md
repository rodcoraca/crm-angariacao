# OSFLOW — CURRENT STATE

**Versão:** RC1.3.4
**Última atualização:** Julho de 2026

---

# VISÃO GERAL

## Estado do Projeto

Fase atual:

**Pré-Beta — Estabilização Final**

O OSFlow encontra-se funcionalmente completo para a versão Beta.

O foco atual deixou de ser o desenvolvimento de novas funcionalidades estruturais e passou a ser:

- eliminação de regressões;
- melhoria da experiência do utilizador;
- estabilização da infraestrutura;
- homologação funcional;
- preparação comercial.

---

# PRINCÍPIOS ARQUITETURAIS

Todos os desenvolvimentos devem respeitar obrigatoriamente os seguintes princípios:

- Diagnóstico antes da implementação.
- Avaliação de impacto antes de qualquer alteração.
- Implementação mínima necessária.
- Evitar refactors desnecessários.
- Não alterar layouts sem solicitação explícita.
- Preservar compatibilidade futura com SaaS.
- Todos os módulos respeitam isolamento por empresa (`empresa_id`).
- Toda ação crítica deve possuir autenticação, autorização e auditoria.
- Gestão de permissões permanece exclusivamente no módulo Utilizadores.

---

# ESTADO DA INFRAESTRUTURA

## Autenticação

Status:

**Estável**

Implementado:

- bootstrap determinístico;
- hidratação idempotente;
- recuperação automática de sessão;
- persistência após refresh (F5);
- proteção contra reconstruções duplicadas;
- separação consistente entre `auth.users` e `usuarios`;
- guards contra race conditions.

Resultado:

- Login estável.
- Logout estável.
- Refresh estável.
- Navegação estável.

---

## Autorização (RBAC)

Status:

Estável.

Características:

- permissões carregadas após hidratação;
- separação entre autenticação e autorização;
- permissões controladas exclusivamente pelo módulo Utilizadores.

---

## Auditoria

Status:

Operacional.

Atualmente registado:

- login;
- logout;
- entrada em páginas;
- saída de páginas.

Planeado:

Auditoria transacional completa.

---

## Sessões

Status:

Estável.

Implementado:

- recuperação automática;
- rebind de sessão;
- encerramento correto;
- atualização de atividade.

---

# ESTADO DOS MÓDULOS

## Cockpit

Status:

Finalizado.

Pendências:

Nenhuma regressão crítica.

---

## Radar

Status:

Finalizado.

Provider operacional:

- Imovirtual.

Correções recentes:

- estabilização após autenticação;
- correção do timer;
- sincronização validada;
- funcionamento confirmado após refresh.

Melhorias futuras:

### Filtro Inteligente

Filtros previstos:

- distrito;
- particulares;
- exclusão de particulares;
- tipologias;
- critérios personalizados.

Objetivos:

- reduzir carga do provider;
- diminuir tempo de sincronização;
- melhorar qualidade das oportunidades.

---

## Fluxo

Status:

Funcional.

Pendência crítica:

### Copiloto Comercial

Problema:

Fluxo regressa para a primeira etapa.

Prioridade:

Alta.

---

## Leads

Status:

Homologado.

---

## Mensagens

Status:

Homologado.

---

## Empresas

Status:

Homologado.

---

## Documentos

Status:

Homologado.

---

## Utilizadores

Status:

Homologado.

Melhorias futuras:

### Auditoria Expandida

Registar:

- criar;
- editar;
- eliminar;
- importar;
- exportar;
- sincronizações;
- alterações administrativas;
- alterações de permissões;
- alterações de configurações;
- alterações de estado.

---

# PROVIDERS

Estado:

Imovirtual operacional.

Arquitetura:

`provider_registry` é a única fonte de verdade.

Roadmap:

- novos providers;
- filtros inteligentes;
- histórico de sincronizações;
- monitorização operacional;
- métricas de desempenho.

---

# SAAS

Estado:

Infraestrutura preparada.

Ainda não iniciado comercialmente.

Decisão arquitetural:

A Beta será concluída antes da implementação das funcionalidades comerciais SaaS.

Planeado:

- multi-tenant definitivo;
- billing;
- provisioning automático;
- gestão de subscrições;
- customer portal;
- onboarding automático.

---

# BETA

Situação:

Muito próxima da conclusão.

Objetivos imediatos:

1. Corrigir regressão do Copiloto Comercial.
2. Expandir auditoria.
3. Melhorar UX.
4. Validar módulos.
5. Preparar demonstrações.
6. Publicar Beta.

---

# DÍVIDA TÉCNICA

Baixa prioridade.

Itens:

- documentação da infraestrutura;
- AUTH_DEBUG apenas para desenvolvimento;
- auditoria transacional;
- monitorização avançada;
- compatibilidade React StrictMode;
- melhorias cosméticas.

---

# DECISÕES ARQUITETURAIS

As seguintes decisões encontram-se encerradas e não deverão ser reabertas sem necessidade justificada:

- Não realizar refactors extensos durante a estabilização da Beta.
- Priorizar estabilidade sobre novas funcionalidades.
- Preservar compatibilidade SaaS em todas as implementações.
- Todo desenvolvimento deve respeitar `empresa_id`.
- Gestão de permissões permanece centralizada em Utilizadores.
- `provider_registry` permanece como fonte única de verdade para sincronizações.
- A infraestrutura de autenticação implementada na RC1.3.4 passa a ser a baseline oficial do projeto.

---

# PRÓXIMOS PASSOS

Curto prazo:

- concluir homologação funcional;
- eliminar regressões remanescentes;
- finalizar auditoria;
- preparar demonstrações comerciais.

Médio prazo:

- publicação da Beta;
- validação com utilizadores reais;
- recolha de feedback operacional.

Longo prazo:

- evolução para SaaS;
- expansão dos providers;
- novas funcionalidades inteligentes;
- automação comercial.