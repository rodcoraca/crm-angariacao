# Decisões Arquiteturais

## DA-001

A sincronização nunca constrói ViewModels.

Motivação

Separação de responsabilidades.

---

## DA-002

O Repository nunca executa regras de negócio.

Motivação

Baixo acoplamento.

---

## DA-003

Toda paginação ocorre na Base de Dados.

Motivação

Escalabilidade.

---

## DA-004

KPI nunca dependem da tabela carregada.

Motivação

Performance.

---

## DA-005

Oportunidades nunca são removidas fisicamente.

Motivação

Histórico.

---

## DA-006

Provider nunca conhece UI.

Motivação

Arquitetura desacoplada.

---

## DA-007

Toda alteração deverá preservar compatibilidade com funcionalidades homologadas.

Motivação

Redução de regressões.