# IMPLEMENTATION STANDARD

## Objetivo
Definir o padrão interno obrigatório de implementação para novos módulos criados por IA na plataforma OSFlow, garantindo consistência técnica, rastreabilidade e segurança evolutiva.

## Última revisão
2026-07-05

## Versão do documento
1.0.0

## Responsável
Engenharia da Plataforma OSFlow

## Identificador do documento
DOC-010

## Documentos Relacionados
- [INDEX.md](./INDEX.md)
- [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)
- [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)
- [SECURITY.md](./SECURITY.md)
- [DECISIONS.md](./DECISIONS.md)

## Índice
- 1. Escopo
- 2. Sequência Obrigatória
- 3. Regras de Aplicação
- 4. Critérios de Encerramento
- 5. Conclusão
- Histórico de Revisões
- Próximas Revisões

## Conteúdo

## 1. Escopo

Este padrão aplica-se a toda nova implementação de módulo realizada por IA na OSFlow. Não altera módulos existentes sem solicitação explícita.

## 2. Sequência Obrigatória

Toda nova implementação deverá seguir exatamente esta ordem:

1. Criar tabelas.
2. Criar migration.
3. Criar permissões.
4. Criar validações.
5. Criar APIs.
6. Criar interface.
7. Registrar auditoria.

## 3. Regras de Aplicação

- A sequência é obrigatória e não pode ser invertida.
- Não remover etapas, mesmo quando a implementação inicial for parcial.
- Cada etapa deverá manter compatibilidade com a arquitetura e fluxos atuais.
- Toda evolução estrutural deverá ser documentada em `docs` antes da conclusão.
- Não modificar módulos existentes além do estritamente solicitado.

## 4. Critérios de Encerramento

Uma implementação de novo módulo só é considerada concluída quando:

- as sete etapas foram implementadas ou preparadas formalmente;
- a migração SQL está registada em [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md);
- a rastreabilidade documental foi atualizada no índice oficial.

## 5. Conclusão

Este documento estabelece o padrão oficial para futuras implementações assistidas por IA na OSFlow, assegurando uniformidade técnica, previsibilidade de entrega e governança de evolução.

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
| --- | --- | --- | --- |
| 1.0.0 | 2026-07-05 | Engenharia da Plataforma OSFlow | Criação do padrão interno obrigatório para novos módulos implementados por IA. |

## Próximas Revisões

- Relacionar este padrão com decisões técnicas futuras.
- Definir checklist de validação por etapa.
- Acrescentar exemplos de implementação por módulo.
