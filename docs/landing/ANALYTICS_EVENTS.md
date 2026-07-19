# ANALYTICS_EVENTS.md

Última atualização: Julho 2026

# Objetivo

Padronizar todos os eventos de tracking da Landing Page do OSFlow.

---

# EVENTOS PRINCIPAIS

## Visualização da Landing

Evento:

landing_view

Trigger:

Primeiro carregamento da página.

---

## Scroll 25%

Evento:

landing_scroll_25

---

## Scroll 50%

Evento:

landing_scroll_50

---

## Scroll 75%

Evento:

landing_scroll_75

---

## Scroll 100%

Evento:

landing_scroll_100

---

# CTA HERO

Evento:

landing_cta_hero_click

Parâmetros:

* location: hero

---

# CTA FUNCIONALIDADES

Evento:

landing_cta_features_click

Parâmetros:

* location: modules

---

# CTA FINAL

Evento:

landing_cta_final_click

Parâmetros:

* location: footer

---

# MÓDULOS

## Cockpit

landing_module_cockpit_click

---

## Radar

landing_module_radar_click

---

## Fluxo

landing_module_fluxo_click

---

## Leads

landing_module_leads_click

---

## Mensagens

landing_module_mensagens_click

---

## Empresas

landing_module_empresas_click

---

## Documentos

landing_module_documentos_click

---

## Utilizadores

landing_module_utilizadores_click

---

# FORMULÁRIO

## Início

Evento:

demo_form_started

---

## Campo Preenchido

Evento:

demo_form_field_completed

Parâmetros:

* field_name

---

## Submissão

Evento:

demo_form_submitted

---

## Sucesso

Evento:

demo_form_success

---

## Erro

Evento:

demo_form_error

Parâmetros:

* error_type

---

# ORIGEM DE TRÁFEGO

Capturar:

* utm_source
* utm_medium
* utm_campaign
* utm_content
* referrer

---

# CONVERSÕES

## Conversão Primária

Evento:

demo_form_success

---

## Conversões Secundárias

* clique CTA Hero
* clique CTA Final
* scroll > 75%
* visualização dos módulos

---

# DASHBOARD EXECUTIVO

Métricas:

* Visitantes
* CTR Hero
* CTR CTA Final
* Tempo médio na página
* Conversões
* Taxa de conversão
* Origem das leads
* Módulos mais visualizados

---

# NOMENCLATURA PADRÃO

Formato:

landing_[area]_[action]

Exemplos:

landing_cta_hero_click

landing_module_radar_click

landing_form_submit

landing_demo_success

---

# OBJETIVO FINAL

Permitir acompanhamento completo do funil:

Visitante
↓

Interação
↓

Interesse
↓

Pedido de demonstração
↓

Lead qualificada
↓

Cliente potencial
