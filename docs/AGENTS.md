# OSFlow Agent Rules

## Mandatory Implementation Sequence for New Modules

For every new module created by AI in this repository, follow this exact sequence:

1. Create tables.
2. Create migration.
3. Create permissions.
4. Create validations.
5. Create APIs.
6. Create interface.
7. Register audit.

## Enforcement Rules

- Do not skip steps.
- Do not change existing modules unless explicitly requested.
- Keep backward compatibility with existing flows.
- Use existing project structure and coding patterns.
- Document the migration and traceability in /docs before closing the task.

## Scope

These rules apply to future AI-driven implementations only.

## Deploy Baseline Obrigatorio

Para qualquer operacao de deploy, migration remota ou alteracao do estado publicado,
o Copilot deve primeiro consultar:

- `docs/OSFLOW_DEPLOY_BASELINE.md`;
- `docs/OSFLOW_DEPLOY_STATE.json`;
- `scripts/check-deploy-baseline.ps1`.

O fluxo obrigatorio e:

1. identificar o baseline atual;
2. obter o commit, branch e estado do worktree;
3. comparar as migrations locais posteriores ao baseline;
4. verificar dependencias e alteracoes de codigo relacionadas;
5. executar testes, lint e validacao SQL aplicaveis;
6. apresentar um plano de deploy com estado `READY` ou `BLOCKED`;
7. executar deploy somente quando o utilizador autorizar explicitamente;
8. validar o resultado remoto;
9. atualizar o baseline somente depois de deploy e pos-validacao bem-sucedidos.

O Copilot nao deve executar `migration repair`, marcar migrations como aplicadas,
apagar historico, resetar o banco, recriar schema ou reconstruir a historia remota
sem autorizacao explicita e sem diagnostico de impacto.

Uma divergencia entre migrations locais e historico remoto nao bloqueia
automaticamente o trabalho quando o baseline define o ultimo estado validado.
Contudo, o Copilot deve parar se a divergencia puder causar perda de dados,
conflito de DDL, inconsistencia de schema, quebra de RLS/RPC ou risco de seguranca.
