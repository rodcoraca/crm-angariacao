# OSFlow Architecture

Este documento define a arquitetura oficial da plataforma OSFlow e deve ser utilizado como referencia principal para qualquer alteracao futura no produto.

## 1. Visao da OSFlow

A OSFlow e uma plataforma operacional para gestao comercial, imobiliaria e de equipas, com foco em:

- Centralizacao de processos operacionais.
- Aumento de visibilidade de performance.
- Padronizacao de fluxos entre equipas.
- Escalabilidade para operacao multi-empresa (SaaS).

A plataforma e composta por modulos funcionais integrados, com evolucao progressiva para arquitetura SaaS multi-tenant.

## 2. Principios da Plataforma

- Separacao clara entre apresentacao, estado e persistencia.
- Evolucao incremental sem regressao funcional.
- Reutilizacao de componentes e tokens de tema.
- Contratos de dados estaveis para evitar quebra entre modulos.
- Observabilidade e auditabilidade orientadas a operacao.
- Preparacao para multi-tenant sem acoplamento prematuro.

## 3. Organizacao dos Modulos

A OSFlow organiza-se em camadas e modulos:

- Camada institucional (Landing).
- Camada aplicacional (CRM / App).
- Modulos de dominio: Leads, Imoveis, Utilizadores, Logs, Fluxos, Mensagens e afins.
- Camadas transversais: Theme, UI, utilitarios, integracoes (Supabase).

Diretriz:

- Cada modulo deve ter fronteiras explicitas.
- Regras de negocio nao devem ficar acopladas a componentes visuais.

## 4. Arquitetura Frontend

Stack atual:

- React (CRA), organizacao por paginas, componentes e utilitarios.

Estrutura recomendada:

- pages/: composicao por ecras e orquestracao de fluxos.
- components/: blocos reutilizaveis e componentes de dominio.
- viewmodels/: adaptacao de dados para consumo da UI.
- theme/: tokens, contexto e padroes visuais.
- utils/: funcoes puras e helpers transversais.

Diretrizes frontend:

- Evitar logica de persistencia dentro de componentes de UI.
- Preferir ViewModel para desacoplar formato de dados da interface.
- Garantir responsividade e consistencia visual por tokens.

## 5. Arquitetura Backend

Contexto atual:

- Persistencia e autenticacao suportadas por Supabase.

Direcao arquitetural:

- Manter camada de acesso a dados previsivel e auditavel.
- Encapsular operacoes criticas por contexto de dominio.
- Preparar segregacao por tenant (empresa) de forma progressiva.

Evolucao recomendada:

- Definicao de servicos por agregado de dominio.
- Contratos de API internos para reduzir acoplamento direto da UI a tabelas.

## 6. Estrutura da Base de Dados

Princípios de modelacao:

- Entidades de negocio com chaves estaveis.
- Relacoes explicitas entre utilizadores, equipas, departamentos e agentes.
- Campos de auditoria (created_at, updated_at, created_by, etc.) sempre que aplicavel.
- Preparacao para isolamento multi-tenant.

Diretriz para evolucao SaaS:

- Introduzir identificadores de contexto organizacional com migracoes controladas:
  - empresaId
  - roleId
  - departamentoId
  - equipaId
  - supervisorId

## 7. Utilizadores

Responsabilidades do modulo:

- Cadastro e edicao de dados pessoais e de conta.
- Vinculacao organizacional e perfil de acesso.
- Controlo de estado do utilizador (ativo/inativo).

Diretrizes:

- Separar dados pessoais, conta, perfil, acesso, organizacao e preferencias.
- Usar ViewModel para preparar dados da ficha de utilizador.
- Nao acoplar regras de permissao diretamente a campos visuais.

## 8. Agentes

Papel do conceito Agente:

- Representar operadores responsaveis por leads, tarefas ou processos.
- Permitir atribuicao, rastreabilidade e medicao de performance.

Boas praticas:

- Exibir nomes em formato de apresentacao padronizado.
- Preservar identificador interno unico para integridade relacional.
- Evitar derivar identidade apenas por nome textual.

## 9. Permissoes

Modelo de permissao:

- Permissoes modulares por area funcional.
- Capacidade de expansao para RBAC (Role-Based Access Control).

Direcao futura:

- roleId como pivô para mapeamento de capacidades.
- Matriz de permissoes por modulo e acao (visualizar, criar, editar, apagar, administrar).

## 10. Organizacao

Escopo organizacional esperado:

- Empresa
- Departamento
- Equipa
- Supervisor

Objetivo:

- Refletir hierarquia operacional no produto sem rigidez excessiva.
- Permitir filtros, visibilidade e governanca por contexto organizacional.

## 11. Dashboard Executivo

Funcao:

- Sintese de indicadores criticos para decisao de gestao.

Princípios:

- KPIs claros, comparaveis e contextualizados.
- Priorizacao de sinal sobre ruido.
- Latencia e consistencia adequadas para acompanhamento tatico.

## 12. Cockpit

Funcao:

- Centro operacional de monitorizacao e acao rapida.

Diretrizes:

- Visualizacoes orientadas a excecao (alertas, bloqueios, pendencias).
- Acoes contextuais com minimo de cliques.
- Estado operacional consolidado por modulo/equipa.

## 13. Camada Intelligence

Objetivo:

- Transformar dados operacionais em insights acionaveis.

Componentes esperados:

- Action Center
- Activity Feed
- Blockers
- Insight Cards

Princípios:

- Regras explicitas para geracao de sinal.
- Priorizacao por impacto e urgencia.
- Transparencia dos criterios de recomendacao.

## 14. Design System

Base visual:

- Theme central com tokens de cor, tipografia, espacamentos, sombras e raios.

Regras:

- Componentes devem consumir tokens, nao valores hardcoded.
- Variacoes de estado (hover, focus, disabled, erro) devem ser padronizadas.
- Acessibilidade e legibilidade como requisitos de base.

## 15. Convencoes de Codigo

Padroes gerais:

- Nomes sem ambiguidades e com intencao clara.
- Funcoes pequenas e coesas.
- Evitar duplicacao de logica.
- Comentarios apenas quando agregam contexto arquitetural.

Estrutura:

- UI em componentes.
- Orquestracao em paginas.
- Adaptacao em viewmodels.
- Utilitarios puros em utils.

Qualidade:

- Preservar contratos existentes ao refatorar.
- Validar build apos alteracoes relevantes.

## 16. Roadmap Tecnico

Fase 1 (curto prazo):

- Consolidar padroes visuais e componentes reutilizaveis.
- Reduzir acoplamentos entre UI e acesso a dados.
- Expandir cobertura de testes unitarios em utilitarios e viewmodels.

Fase 2 (medio prazo):

- Estruturar servicos de dominio para operacoes criticas.
- Melhorar observabilidade e trilhas de auditoria.
- Padronizar contratos internos de dados por modulo.

Fase 3 (longo prazo):

- Evoluir para arquitetura multi-tenant robusta.
- Endurecer governanca de acesso e compliance operacional.

## 17. Roadmap SaaS

Objetivo central:

- Transformar a plataforma em produto multi-tenant, seguro e escalavel.

Etapas sugeridas:

1. Preparacao de arquitetura (comentarios tecnicos, ViewModels e fronteiras de dominio).
2. Introducao progressiva de identificadores organizacionais:
   - empresaId
   - roleId
   - departamentoId
   - equipaId
   - supervisorId
3. Migracoes de dados com retrocompatibilidade.
4. Isolamento de acesso por tenant e perfil.
5. Governanca de billing, planos e capacidades por tenant.

## 18. Boas praticas para futuras implementacoes

- Nao alterar logica de negocio sem validar impacto transversal.
- Evitar mudancas simultaneas de UI, dados e permissao no mesmo ciclo sem necessidade.
- Introduzir novas capacidades primeiro em camada de arquitetura (ViewModel/contratos) e depois em persistencia.
- Documentar decisoes estruturais antes da implementacao.
- Garantir que toda evolucao preserve estabilidade operacional.
- Priorizar compatibilidade regressiva em fluxos criticos.

---

## Regra de referencia arquitetural

Este documento e a fonte primaria de referencia tecnica da OSFlow.

Sempre que houver divergencia entre implementacao e diretriz arquitetural, a alteracao deve ser justificada tecnicamente e atualizada neste documento para manter rastreabilidade.
