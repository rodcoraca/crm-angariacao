# DISCOVERY ENGINE

## Objetivo

Infraestrutura inicial para futuros providers de captação de imóveis particulares, sem alterar interface, UX, autenticação, RBAC ou providers existentes.

## Implementação DB-025

A migração [20260710_db025_provider_leads_discovery_engine.sql](../sql/migrations/20260710_db025_provider_leads_discovery_engine.sql) cria `provider_leads`, única por `provider` e `external_id`.

`ImovirtualProvider` extrai o `__NEXT_DATA__` das páginas de pesquisa e normaliza os itens de `props.pageProps.data.searchAds.items`. A sincronização manual persiste apenas anúncios ainda ausentes em `provider_leads`, com estado `new`. Criação e processamento usam a auditoria central existente.

## Scheduler futuro

Um scheduler futuro deve invocar apenas `runAll()`. Periodicidade e integração com Pipeline permanecem fora do escopo.

## Execução manual

`npm run imovirtual:sync` executa uma sincronização manual, sem scheduler, e apresenta totais e os cinco primeiros anúncios normalizados.

## Beta funcional Imovirtual

DB-026 adiciona os campos normalizados de imóvel, localização, proprietário, origem e publicação em `provider_leads`. A página isolada `RadarImovirtual` consome esses dados com filtros operacionais; o seu registo em navegação fica pendente de validação manual para preservar o `App.jsx` e o layout existentes.
