# OSFlow – Decisão de Arquitetura

## Gestão de Propriedade, Permissões e Transferência de Leads

**Documento:** DEC-LEADS-001
**Estado:** Aprovado
**Módulo:** Leads (CRM)
**Versão:** 1.0

---

# Objetivo

Definir a arquitetura funcional da propriedade das Leads, respetivas permissões de edição e regras de transferência, garantindo simplicidade, rastreabilidade e consistência em todo o OSFlow.

---

# 1. Princípios

O OSFlow adota o princípio de **propriedade operacional única**.

Cada Lead possui apenas um **Agente Responsável**, que representa simultaneamente:

* Responsável operacional pela Lead;
* Proprietário da Lead;
* Utilizador responsável pelo acompanhamento comercial;
* Referência para indicadores e métricas.

Não existirão campos adicionais para representar o proprietário da Lead.

O campo **Agente Responsável** constitui a única fonte de verdade (*Single Source of Truth*).

---

# 2. Atribuição Inicial

Quando uma Lead é importada através do Radar ou de qualquer outro processo de importação:

* O utilizador que executa a importação torna-se automaticamente o Agente Responsável da Lead.
* A atribuição é efetuada automaticamente pelo sistema.
* A criação da Lead e a respetiva atribuição devem ser registadas na auditoria.

---

# 3. Visualização

Todas as Leads pertencentes à empresa podem ser visualizadas por qualquer utilizador autorizado dessa empresa.

A visualização inclui:

* Dados da Lead;
* Histórico;
* Timeline;
* Contactos;
* Estado;
* Atividades;
* Documentos;
* Observações.

A visualização não implica permissões de edição.

---

# 4. Regra de Edição

Uma Lead apenas pode ser alterada quando o utilizador cumprir uma das seguintes condições:

* Ser Administrador;
* Ser Diretor Comercial;
* Ser o Agente Responsável da Lead.

Caso contrário, a Lead deverá permanecer em modo apenas de leitura.

Esta regra aplica-se a qualquer alteração efetuada sobre a Lead.

---

# 5. Transferência de Responsabilidade

A alteração do Agente Responsável apenas poderá ser efetuada por:

* Administrador;
* Diretor Comercial;
* Agente Responsável atual.

A transferência altera exclusivamente o Agente Responsável da Lead.

Não existirão múltiplos proprietários.

---

# 6. Modelo de Permissões

O sistema utilizará simultaneamente:

## Privilégios Globais

Determinados pelo RBAC existente:

* Administrador;
* Diretor Comercial.

Estas permissões já existem no sistema e não necessitam de novas permissões específicas.

## Propriedade

Quando o utilizador corresponde ao Agente Responsável da Lead.

A autorização resulta da combinação destes dois fatores.

---

# 7. Auditoria

Todas as transferências deverão ser obrigatoriamente registadas.

O registo deverá conter, no mínimo:

* Lead;
* Responsável anterior;
* Novo responsável;
* Utilizador que executou a transferência;
* Data e hora;
* Origem da operação.

Quando aplicável, deverão ser produzidos eventos para:

* Histórico da Lead;
* Antigo responsável;
* Novo responsável;
* Utilizador executor (quando diferente do responsável anterior).

---

# 8. Timeline da Lead

Sempre que ocorrer uma transferência deverá surgir um evento semelhante a:

> Carlos Silva transferiu a responsabilidade da Lead de João Ferreira para Maria Costa.

Este evento passa a fazer parte do histórico permanente da Lead.

---

# 9. Implementação

A lógica de autorização deverá ser centralizada numa camada de serviço.

Nenhum componente da interface deverá implementar regras próprias de autorização.

Toda a aplicação deverá utilizar a mesma função de validação de permissões.

---

# 10. Objetivos Arquiteturais

Esta decisão pretende garantir:

* Modelo de dados simples;
* Ausência de redundância;
* Uma única fonte de verdade;
* Regras consistentes em toda a aplicação;
* Auditoria completa;
* Facilidade de manutenção;
* Escalabilidade futura sem alterações estruturais.

---

# Decisão Final

Fica aprovado que:

* O Agente Responsável representa o proprietário operacional da Lead.
* Não será criado qualquer campo adicional para representar a propriedade.
* A edição e transferência obedecem às regras definidas neste documento.
* Todas as alterações relevantes serão auditadas.
* O RBAC existente permanece inalterado, sendo complementado apenas pela validação da propriedade da Lead.
