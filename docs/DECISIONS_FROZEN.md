# DECISÕES CONGELADAS

## Produto

* Leads é o principal diferencial do OSFlow.
* Imovirtual encontra-se operacional.
* Gestão de permissões permanece exclusivamente em Utilizadores.
* Todos os módulos devem respeitar empresa_id.

## Desenvolvimento

Workflow obrigatório:

Diagnóstico
→ Impacto
→ Implementação mínima
→ Testes
→ Git
→ Deploy

Evitar:

* grandes refactors;
* alterações especulativas;
* mudanças estruturais sem evidência.

## SaaS

* Multi-tenant definitivo permanece pós-Beta.
* Billing, Stripe e Provisionamento automático permanecem fora do escopo atual.

## Auditoria

Toda ação relevante do sistema deverá futuramente ser auditável.

Objetivo:

Auditoria completa do ecossistema OSFlow.
