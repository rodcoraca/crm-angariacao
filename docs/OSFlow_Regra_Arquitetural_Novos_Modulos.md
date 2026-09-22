# OSFlow — Regra Arquitetural para Novos Módulos e Funcionalidades

**Documento:** Regra Arquitetural
**Projeto:** OSFlow — ERP Imobiliário
**Status:** Regra obrigatória
**Aplicação:** Todo o projeto OSFlow

---

## 1. Objetivo

Estabelecer uma regra permanente para a criação ou alteração de módulos, menus, submenus, páginas e funcionalidades relevantes do OSFlow.

Toda nova funcionalidade deve seguir os padrões arquiteturais já estabelecidos na aplicação, evitando a criação de mecanismos paralelos ou inconsistentes.

---

## 2. Regra Geral

Todo novo módulo, menu, submenu, página ou funcionalidade relevante do OSFlow deve obrigatoriamente ser integrado a:

- sistema central de permissões/RBAC;
- mecanismo oficial de auditoria;
- isolamento por empresa/tenant e respetivas regras de RLS;
- padrão de navegação existente;
- serviços e repositories existentes;
- Design System;
- padrão Adaptive & Responsive UI;
- padrões de testes e validação do projeto.

Nenhum desses pontos deve ser tratado como opcional quando for aplicável ao recurso desenvolvido.

---

## 3. Permissões e RBAC

Todo novo recurso deve ser analisado em relação ao catálogo central de permissões.

### Regras

1. Verificar primeiro se já existe uma permissão que represente corretamente o recurso.
2. Se existir, reutilizar a permissão existente.
3. Se não existir uma permissão adequada, criar uma nova permissão seguindo a nomenclatura e estrutura já estabelecidas.
4. A navegação deve respeitar a autorização centralizada.
5. As operações realizadas pelo recurso também devem respeitar as permissões correspondentes.
6. Não criar mecanismos paralelos de autorização.
7. Não utilizar acessos hardcoded para contornar o RBAC existente.

A decisão de reutilizar ou criar uma nova permissão deve ser identificada durante o diagnóstico antes da implementação.

---

## 4. Auditoria

Todo novo recurso deve utilizar o mecanismo oficial de auditoria do OSFlow.

As operações relevantes devem ser rastreáveis através do padrão de auditoria existente, incluindo, quando aplicável:

- utilizador/ator;
- empresa/tenant;
- módulo;
- entidade;
- entidade afetada;
- ação/evento;
- data/hora;
- estado anterior;
- estado posterior;
- metadata complementar.

### Ações automáticas

Ações executadas automaticamente pelo sistema devem ser identificadas como **Sistema**.

Nunca atribuir uma ação automática a um utilizador por inferência, associação indireta ou pelo simples facto de esse utilizador ser responsável pela entidade afetada.

---

## 5. Tenant e RLS

Todo novo recurso que manipule dados deve respeitar o isolamento por empresa/tenant.

Antes da implementação, verificar:

- `empresa_id`;
- resolução do tenant;
- RLS aplicável;
- permissões de leitura;
- permissões de escrita;
- escopo de acesso por utilizador, quando aplicável;
- RPCs e funções utilizadas pelo recurso.

Não utilizar bypass de RLS como solução funcional.

Qualquer exceção deve ser tecnicamente justificada e seguir o padrão de segurança já estabelecido.

---

## 6. Reutilização da Arquitetura Existente

Antes de criar novas estruturas, verificar obrigatoriamente se já existem mecanismos reutilizáveis para:

- serviços;
- repositories;
- hooks;
- componentes;
- Design System;
- autorização;
- auditoria;
- RPCs;
- migrations;
- RLS;
- navegação;
- validações;
- testes.

### Princípio

**Não criar uma segunda arquitetura para resolver um problema que a arquitetura existente já resolve.**

Evitar especificamente:

- novo sistema de permissões paralelo;
- novo sistema de auditoria paralelo;
- logs paralelos para substituir o mecanismo oficial;
- regras de negócio duplicadas no frontend;
- mecanismos próprios de tenant isolation;
- componentes duplicados quando existe um componente reutilizável adequado.

---

## 7. Diagnóstico Obrigatório Antes da Implementação

Antes de qualquer alteração de código para um novo módulo ou funcionalidade, deve ser realizado um diagnóstico.

O diagnóstico deve identificar:

- arquitetura atual;
- módulo e navegação existentes;
- permissões relacionadas;
- mecanismo de auditoria;
- entidades e tabelas envolvidas;
- serviços e repositories;
- hooks e componentes reutilizáveis;
- tenant/RLS;
- RPCs e migrations relevantes;
- padrões de UX aplicáveis;
- testes existentes;
- lacunas;
- riscos;
- impacto da alteração;
- proposta técnica mínima.

A implementação deve começar somente depois de concluída essa análise.

---

## 8. Navegação

Novos menus, submenus e páginas devem ser integrados ao padrão de navegação existente.

A nova navegação deve:

- respeitar as permissões;
- utilizar as estruturas existentes;
- manter consistência visual;
- respeitar o contexto do módulo;
- funcionar corretamente em desktop, tablet e mobile.

Não criar rotas ou mecanismos de navegação paralelos sem necessidade arquitetural comprovada.

---

## 9. UX e Adaptive & Responsive UI

Todo novo recurso deve respeitar o padrão visual e comportamental do OSFlow.

Aplicar:

- Design System existente;
- componentes reutilizáveis;
- estados de loading;
- estados vazios;
- estados de erro;
- feedback visual através dos componentes oficiais;
- acessibilidade;
- Adaptive & Responsive UI.

A interface deve adaptar estrutura, navegação, densidade de informação e interações ao contexto de desktop, tablet e mobile.

Não tratar mobile apenas como uma versão reduzida do desktop.

---

## 10. Auditoria Não é Telemetria

Não utilizar logs de navegação, telemetria ou mecanismos equivalentes como substituição da auditoria de operações.

Devem ser distinguidos:

- auditoria de ações relevantes sobre dados e entidades;
- telemetria;
- navegação;
- eventos técnicos do sistema.

Cada mecanismo deve continuar a cumprir a sua finalidade específica.

---

## 11. Definition of Done Estrutural

Um novo módulo ou funcionalidade não deve ser considerado estruturalmente concluído sem validar, quando aplicável:

**Navegação + Permissão + Auditoria + Tenant/RLS + Testes**

Além disso, deve cumprir os padrões de:

**Arquitetura + Design System + UX + Adaptive & Responsive UI**

---

## 12. Processo Obrigatório de Desenvolvimento

O processo padrão para novos recursos do OSFlow será:

1. **Diagnóstico**
2. **Análise de impacto**
3. **Identificação das permissões**
4. **Identificação dos eventos de auditoria**
5. **Validação de tenant/RLS**
6. **Definição da solução técnica mínima**
7. **Implementação**
8. **Validação**
9. **Testes**
10. **Revisão final contra esta regra**

O estudo, diagnóstico e definição da solução devem preceder a implementação.

---

## 13. Regra de Não Duplicação

Antes de introduzir qualquer nova tabela, serviço, RPC, mecanismo de autorização, mecanismo de auditoria ou componente estrutural, deve ser demonstrado que a arquitetura existente não atende adequadamente à necessidade.

A solução preferencial é sempre:

> **Reutilizar → Estender → Criar somente quando necessário.**

---

## 14. Aplicação aos Prompts de Desenvolvimento

Esta regra é permanente e deve ser considerada em todos os prompts de implementação destinados ao Copilot.

Os prompts específicos de cada tarefa não precisam reproduzir integralmente este documento, mas devem indicar explicitamente que esta regra arquitetural é obrigatória.

Exemplo:

> Aplicar obrigatoriamente a Regra Arquitetural OSFlow para novos módulos e funcionalidades. Validar permissões/RBAC, auditoria, tenant/RLS, navegação, Design System e padrões existentes antes da implementação. Não criar mecanismos paralelos. Se for necessária uma nova permissão, evento de auditoria ou estrutura arquitetural, identificar e justificar no diagnóstico antes de implementar.

---

## 15. Princípio Fundamental

O crescimento do OSFlow deve preservar consistência arquitetural.

**Nenhum novo módulo deve ser desenvolvido como uma ilha.**

Cada nova funcionalidade deve fazer parte da mesma arquitetura de:

**Permissões → Auditoria → Tenant/RLS → Serviços → Navegação → UX → Testes**

Essa regra existe para garantir segurança, rastreabilidade, manutenção e evolução consistente do OSFlow.
