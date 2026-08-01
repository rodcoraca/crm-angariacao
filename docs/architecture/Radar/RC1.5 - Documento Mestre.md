# RC1.5 – Radar Performance, Escalabilidade e Nova Arquitetura

**Projeto:** OSFlow ERP Imobiliário  
**Módulo:** Radar  
**Versão:** RC1.5  
**Status:** Aprovado para implementação

# Princípios Inegociáveis

Durante qualquer implementação desta RC é obrigatório respeitar:

1. Não alterar comportamento homologado sem necessidade técnica.

2. Não misturar refatoração com implementação funcional.

3. Uma alteração deve possuir apenas um objetivo.

4. Evitar alterações em múltiplos módulos na mesma entrega.

5. Sempre preservar compatibilidade com funcionalidades existentes.

6. Diagnóstico antes de implementação.

7. Implementação antes de otimização.

8. Otimização baseada em evidências.

9. Código simples é preferível a código inteligente.

10. Em caso de dúvida, preservar estabilidade.

---

# Objetivo

Esta RC tem como objetivo evoluir a arquitetura do módulo Radar para suportar crescimento contínuo da base de oportunidades, mantendo excelente desempenho, simplicidade operacional e preparação para múltiplos providers.

A implementação deverá eliminar os atuais gargalos de processamento no frontend, reduzir o tempo de carregamento do Radar e preparar o módulo para operar com dezenas ou centenas de milhares de oportunidades.

Esta RC **não altera regras de negócio**, apenas a arquitetura de sincronização, armazenamento e consulta.

---

# Escopo

Esta RC define a arquitetura de referência do módulo Radar.

Não faz parte desta RC:

- alterações nas regras comerciais;
- alterações de layout que não estejam descritas neste documento;
- otimizações não fundamentadas por diagnóstico;
- refatorações gerais sem relação direta com os objetivos desta RC.

# Princípios da Implementação

Toda decisão desta RC deverá respeitar os seguintes princípios:

- Simplicidade para o utilizador
- Escalabilidade
- Performance
- Histórico preservado
- Código desacoplado
- Uma única fonte de verdade
- Preparação para múltiplos providers

---

# Problema Atual

Hoje o fluxo do Radar funciona aproximadamente desta forma:

```
Provider
        ↓
SELECT *
        ↓
Carrega milhares de oportunidades
        ↓
Normalização
        ↓
Classificação
        ↓
Ordenação
        ↓
Construção dos KPI
        ↓
Construção da Timeline
        ↓
Construção da Roadmap
        ↓
Construção da Tabela
        ↓
Renderização
```

Consequências:

- abertura lenta do Radar
- elevado consumo de memória
- processamento desnecessário
- pouca escalabilidade

O sistema processa milhares de oportunidades para apresentar apenas 20 linhas ao utilizador.

---

# Nova Arquitetura

A sincronização deixa de ser responsável pela construção da interface.

Passará apenas a atualizar a base de dados.

Novo fluxo:

```
Provider

↓

Sincronização

↓

Base de Dados

↓

Consultas SQL

↓

ViewModel

↓

Interface
```

A interface passa a consultar apenas os dados necessários.

---

# Provider Active

Adicionar na tabela **provider_leads**:

```sql
provider_active BOOLEAN DEFAULT TRUE;

last_seen_at TIMESTAMPTZ;
```

---

## Funcionamento

Durante a sincronização:

Sempre que uma oportunidade for encontrada:

```
provider_active = TRUE

last_seen_at = timestamp da sincronização
```

Após terminar completamente a sincronização:

Todas as oportunidades cujo:

```
last_seen_at < timestamp atual
```

serão automaticamente marcadas como:

```
provider_active = FALSE
```

---

# Histórico

As oportunidades **não serão apagadas**.

O histórico será preservado.

Toda a interface utilizará exclusivamente:

```sql
WHERE provider_active = TRUE
```

Benefícios:

- histórico completo
- auditoria
- futuras estatísticas
- análises de conversão
- recuperação futura

---

# Repository

Eliminar completamente consultas:

```sql
SELECT *
```

Todas as consultas deverão ser paginadas.

Exemplo:

```sql
LIMIT 20 OFFSET 0
```

```sql
LIMIT 20 OFFSET 20
```

```sql
LIMIT 20 OFFSET 40
```

O frontend nunca deverá carregar milhares de oportunidades.

---

# KPI

Os KPI deixam de ser calculados a partir da lista carregada.

Cada KPI deverá possuir consulta própria.

Exemplo:

## Monitorizadas

```sql
COUNT(*)

WHERE provider_active = TRUE
```

## Novas

```sql
COUNT(*)

WHERE provider_active = TRUE
AND estado='novo'
```

## Importadas

```sql
COUNT(*)

WHERE provider_active = TRUE
AND estado='importado'
```

As consultas passam a ser extremamente rápidas.

---

# ViewModel

O ViewModel deixa de processar toda a base.

Responsabilidade:

- formatação
- labels
- apresentação

Nunca deverá receber milhares de oportunidades.

Receberá apenas:

- página atual
- KPI já calculados
- informações operacionais

---

# Paginação

Toda a paginação será feita na Base de Dados.

Nunca em memória.

Fluxo correto:

```
SQL

↓

20 registos

↓

ViewModel

↓

Interface
```

---

# Sincronização

A sincronização passa a possuir apenas estas responsabilidades:

- consultar providers
- inserir novas oportunidades
- atualizar oportunidades existentes
- marcar oportunidades removidas como inativas
- atualizar provider_registry

Não deverá construir ViewModels.

Não deverá construir KPI.

Não deverá construir Timeline.

---

# Configuração do Radar

Cada empresa possuirá configurações padrão.

Exemplo:

```
Distrito(s)

☑ Porto

☑ Braga

-------------------

Capturar apenas particulares

☑ Sim
```

Estas configurações serão utilizadas por defeito.

---

# Atualização das Oportunidades

Ao clicar em:

```
Atualizar Oportunidades
```

o sistema não iniciará imediatamente a sincronização.

Será apresentado um diálogo.

---

## Confirmar Atualização

```
Serão utilizadas as seguintes configurações:

Origens

✓ Imovirtual

✓ OLX

Distrito(s)

Porto

Braga

Capturar apenas particulares

Sim

Última sincronização

Hoje às 10:42

Tempo estimado

≈ 20 segundos
```

Botões:

```
Continuar

Alterar filtros

Cancelar
```

---

# Alteração Temporária

Caso o utilizador escolha:

```
Alterar filtros
```

Será apresentada uma janela simples.

```
Distrito(s)

☑ Porto

☑ Braga

☐ Lisboa

☐ Faro

--------------------

☑ Apenas particulares

--------------------

☐ Guardar como padrão da empresa
```

Botões:

```
Atualizar

Cancelar
```

---

# Regra

Caso o utilizador **não marque**:

```
Guardar como padrão da empresa
```

as alterações serão utilizadas apenas naquela sincronização.

A configuração padrão permanecerá inalterada.

---

# Providers

Os providers passam a funcionar de forma independente.

Exemplo:

```
Radar

├── Imovirtual

├── OLX

├── Idealista
```

Cada provider poderá:

- sincronizar
- terminar
- apresentar erro
- atualizar estado

Independentemente dos restantes.

---

# Overlay de Sincronização

Durante a atualização será apresentado um único overlay.

Exemplo:

```
Atualizando oportunidades...

Imovirtual

✓ Concluído

OLX

⟳ Em sincronização

Idealista

Aguardando

Por favor aguarde...
```

O overlay será encerrado apenas quando todos os providers terminarem.

---

# UX

A sincronização deverá continuar extremamente simples.

O utilizador apenas terá duas decisões:

- utilizar a configuração existente
- alterar temporariamente os filtros

Não serão adicionados filtros avançados como:

- preço
- quartos
- área
- score
- data
- tipologia

O objetivo é evitar complexidade desnecessária e garantir consistência operacional.

---

# Benefícios

## Performance

- carregamento praticamente imediato
- consultas SQL leves
- redução drástica do processamento no frontend

---

## Escalabilidade

Preparado para:

- 10.000 oportunidades
- 100.000 oportunidades
- múltiplos providers
- crescimento contínuo

---

## Segurança

Nenhuma oportunidade será perdida.

O histórico permanecerá disponível.

---

## Experiência do Utilizador

Fluxo simples.

Poucos cliques.

Sem configurações complexas.

---

# Ordem de Implementação

## Fase 1

Banco de Dados

- adicionar provider_active
- adicionar last_seen_at

---

## Fase 2

Sincronização

- atualizar oportunidades existentes
- marcar oportunidades removidas como inativas

---

## Fase 3

Repository

- implementar paginação SQL
- aplicar WHERE provider_active = TRUE

---

## Fase 4

KPI

- substituir cálculos em memória por COUNT SQL

---

## Fase 5

Interface

- implementar diálogo de confirmação
- implementar alteração temporária dos filtros
- implementar opção "Guardar como padrão"

---

## Fase 6

Overlay

- progresso da sincronização
- estado de cada provider
- encerramento apenas após conclusão de todos

---

# Arquitetura Final

```
Providers
      │
      ▼
Sincronização
      │
      ▼
provider_leads
(provider_active)
      │
      ▼
Consultas SQL paginadas
      │
      ▼
RadarRepository
      │
      ▼
RadarViewModel
      │
      ▼
Radar UI
```

---

# Critérios de Aceitação

A implementação será considerada concluída quando:

- O Radar deixar de carregar todas as oportunidades em memória.
- Toda a paginação for executada na Base de Dados.
- Os KPI forem calculados através de consultas SQL independentes.
- Apenas oportunidades com `provider_active = TRUE` forem apresentadas ao utilizador.
- O histórico permanecer preservado.
- O utilizador puder confirmar ou alterar temporariamente os filtros antes da sincronização.
- O overlay apresentar o progresso da sincronização até à conclusão de todos os providers.
- A arquitetura suportar naturalmente novos providers sem alterações significativas na interface.

---

# Normas Técnicas de Implementação

Esta RC introduz alterações estruturais importantes no módulo Radar. Para minimizar riscos e preservar a estabilidade do OSFlow, todas as implementações deverão obedecer obrigatoriamente às seguintes normas.

## 1. Implementação Incremental

A RC1.5 não deverá ser implementada numa única entrega.

Cada fase deverá ser concluída, validada e homologada antes do início da fase seguinte.

Não será permitida a implementação simultânea de múltiplas fases que impeçam a identificação da origem de eventuais regressões.

---

## 2. Homologação Obrigatória

Ao final de cada fase deverá ser realizada homologação funcional.

A fase seguinte apenas poderá iniciar após validação da anterior.

Critérios mínimos:

- compilação sem erros;
- funcionamento idêntico ao comportamento esperado;
- ausência de regressões funcionais;
- validação dos fluxos principais.

---

## 3. Preservação da Interface Pública

Sempre que possível, a assinatura pública dos serviços deverá permanecer inalterada.

Exemplo:

Se atualmente o `RadarService` devolve um `snapshot`, continuará a devolver um `snapshot`.

Mudanças arquiteturais deverão ocorrer internamente, evitando impactos desnecessários nas camadas consumidoras.

Este princípio reduz significativamente o risco de regressões.

---

## 4. Compatibilidade Retroativa

Sempre que uma nova funcionalidade for introduzida, deverá coexistir temporariamente com a estrutura atual até que a migração esteja concluída.

Não deverão existir alterações que obriguem múltiplos módulos a serem modificados simultaneamente.

---

## 5. Uma Alteração por Responsabilidade

Cada fase deverá possuir apenas um objetivo técnico claramente definido.

Exemplos:

- migração da base de dados;
- sincronização;
- Repository;
- KPI;
- Interface;
- UX.

Misturar responsabilidades diferentes na mesma implementação aumenta significativamente o risco de regressões.

---

## 6. Não Alterar Regras de Negócio

Esta RC tem como objetivo melhorar:

- desempenho;
- escalabilidade;
- arquitetura;
- experiência do utilizador.

Não deverão ser alteradas regras funcionais já homologadas sem aprovação explícita.

---

## 7. Evidência Antes da Alteração

Qualquer otimização deverá ser baseada em evidências técnicas.

Evitar:

- refatorações especulativas;
- alterações preventivas sem diagnóstico;
- simplificações que modifiquem comportamento homologado.

Toda alteração deverá possuir uma motivação técnica claramente identificada.

---

## 8. Preservação da Arquitetura

A implementação deverá respeitar a separação de responsabilidades.

Provider

- sincroniza.

Repository

- consulta.

Service

- orquestra.

ViewModel

- formata.

Interface

- apresenta.

Nenhuma camada deverá assumir responsabilidades pertencentes a outra.

---

## 9. Critério de Reversão

Cada fase deverá permitir rollback independente.

Caso seja identificada regressão durante homologação, deverá ser possível reverter apenas a fase em execução, sem afetar as anteriores.

---

## 10. Critério de Conclusão

Uma fase apenas será considerada concluída quando:

- comportamento funcional validado;
- desempenho igual ou superior ao esperado;
- ausência de regressões;
- código revisado;
- homologação aprovada.

Somente após esses critérios poderá ser iniciada a fase seguinte.

---

# Filosofia da RC1.5

Esta implementação prioriza evolução arquitetural sustentável em vez de otimizações pontuais.

O objetivo é construir uma base sólida para o crescimento do Radar, preservando a estabilidade do OSFlow durante todo o processo de evolução.

Toda alteração deverá privilegiar simplicidade, previsibilidade, desacoplamento e facilidade de manutenção, garantindo que o sistema continue evoluindo sem comprometer funcionalidades já homologadas.

---

# Governança da Implementação

## Documento Mestre

Este documento passa a ser a referência oficial para toda evolução do módulo Radar.

Nenhuma implementação deverá ser iniciada sem que a solicitação seja previamente confrontada com esta especificação.

Caso uma solicitação entre em conflito com qualquer definição desta RC, deverá ser realizada uma análise de impacto antes de qualquer alteração.

---

## Processo Obrigatório de Avaliação

Toda solicitação relacionada ao Radar deverá seguir obrigatoriamente a seguinte sequência:

### 1. Diagnóstico

Antes de propor qualquer alteração, identificar:

- problema de negócio;
- problema técnico;
- impacto esperado;
- arquitetura afetada.

Nenhuma implementação deverá iniciar sem diagnóstico.

---

### 2. Confronto com a RC1.5

Toda solicitação deverá ser comparada com este documento para verificar:

- compatibilidade arquitetural;
- impacto na escalabilidade;
- impacto na performance;
- impacto na experiência do utilizador;
- impacto nas regras de negócio.

Caso exista conflito, este deverá ser explicitamente apresentado antes da implementação.

---

### 3. Análise de Impacto

Para cada alteração deverá ser identificado:

- módulos afetados;
- serviços afetados;
- banco de dados;
- possíveis regressões;
- compatibilidade com funcionalidades homologadas.

---

### 4. Estratégia de Implementação

A implementação deverá sempre privilegiar:

- menor alteração possível;
- menor risco de regressão;
- reaproveitamento da arquitetura existente;
- compatibilidade retroativa;
- desacoplamento entre camadas.

---

### 5. Homologação

Nenhuma fase será considerada concluída sem validação funcional.

Somente após homologação será permitido iniciar a etapa seguinte.

---

# Princípios Permanentes

Todas as futuras evoluções do Radar deverão respeitar obrigatoriamente os seguintes princípios:

- uma única fonte de verdade;
- consultas SQL otimizadas;
- paginação na base de dados;
- histórico preservado;
- separação clara entre Provider, Repository, Service, ViewModel e UI;
- sincronização desacoplada da interface;
- simplicidade para o utilizador;
- escalabilidade como requisito permanente.

---

# Controle de Regressões

Nenhuma melhoria de desempenho ou nova funcionalidade poderá comprometer funcionalidades previamente homologadas.

Sempre que uma alteração afetar componentes existentes, deverá ser apresentada uma análise de impacto demonstrando:

- o que será alterado;
- o que permanecerá inalterado;
- quais riscos existem;
- como será garantida a ausência de regressões.

---

# Compromisso Arquitetural

Este documento passa a ser a referência oficial para decisões arquiteturais do módulo Radar.

Todas as futuras solicitações deverão ser avaliadas à luz desta especificação antes da elaboração de qualquer prompt, código ou proposta técnica.

Caso uma solicitação contradiga este documento, deverá prevalecer a arquitetura aqui definida, salvo decisão explícita de revisão desta RC.

# Evolução desta RC

Qualquer alteração desta especificação deverá obrigatoriamente:

- apresentar justificativa técnica;
- apresentar análise de impacto;
- preservar compatibilidade com os princípios desta arquitetura;
- ser aprovada antes da implementação.

Não deverão existir alterações implícitas durante o desenvolvimento.

Antes de qualquer alteração confirmar:

☐ O problema foi reproduzido?

☐ A causa raiz foi identificada?

☐ A RC cobre esse cenário?

☐ Existe impacto em outros módulos?

☐ Existe risco de regressão?

☐ A alteração pode ser feita de forma incremental?

☐ Existe plano de rollback?

☐ Existe critério objetivo de homologação?

----

Implementação concluída apenas quando:

☐ Build sem erros.

☐ Linter sem novos problemas.

☐ Fluxo existente preservado.

☐ Performance igual ou superior.

☐ Homologação funcional concluída.

☐ Documento atualizado (caso necessário).

☐ Nenhuma regressão encontrada.

----

Não fazer:

- Refatorações desnecessárias.

- Renomear arquivos apenas por organização.

- Alterar APIs públicas sem necessidade.

- Criar abstrações futuras sem uso imediato.

- Otimizações sem medição.

- Mudar UX durante correções técnicas.

- Alterar regra de negócio durante otimizações.

-----

# Hierarquia de Decisão

Em caso de conflito entre:

- prompts;
- sugestões;
- ideias;
- implementações;

prevalecerá sempre esta RC.

Qualquer exceção deverá resultar primeiro numa atualização da RC e apenas depois na implementação.

# Histórico

| Versão | Data | Descrição |
|---------|------|-----------|
| RC1.5 | Julho/2026 | Primeira especificação oficial da nova arquitetura do Radar |