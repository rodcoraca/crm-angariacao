# OSFlow — Baseline do Histórico de Migrations Supabase

## Estado conhecido

O projeto **OSFlow / crm-angariacao** possui uma divergência conhecida entre:

- o histórico de migrations existente no repositório local; e
- o histórico registrado em `supabase_migrations.schema_migrations` no projeto Supabase remoto.

A implementação das migrations no ambiente remoto **não iniciou necessariamente pela primeira migration do repositório**.

Como consequência, o banco remoto pode conter objetos, funções, policies, tabelas ou alterações correspondentes a migrations antigas que **não aparecem como aplicadas no histórico oficial de migrations remoto**.

## Impacto operacional

O comando:

```bash
supabase db push --linked
```

pode identificar migrations antigas como pendentes mesmo quando parte ou a totalidade de seus efeitos já existe no banco remoto.

Isso pode provocar:

- tentativa de reaplicação de migrations históricas;
- conflitos de objetos já existentes;
- alterações duplicadas ou incompatíveis;
- bloqueio da aplicação de uma migration nova;
- risco de alteração involuntária do ambiente de produção.

## Regra para novos deploys

Antes de aplicar uma nova migration ao Supabase remoto:

1. Confirmar o projeto remoto correto.
2. Executar:

```bash
supabase migration list --linked
```

3. Verificar se existem migrations anteriores ao novo ficheiro marcadas como pendentes.
4. Se existirem, **não executar automaticamente `db push --include-all`**.
5. Não assumir que uma migration pendente no histórico nunca foi executada.
6. Comparar os objetos definidos pela migration com o estado real do banco remoto.
7. Somente depois definir a estratégia de aplicação da nova migration.

## Regra de segurança

Enquanto o baseline remoto não estiver formalmente regularizado:

> **Nenhuma migration histórica deve ser reaplicada automaticamente apenas porque aparece como pendente no histórico remoto.**

Também não executar automaticamente:

```bash
supabase db push --include-all
```

nem:

```bash
supabase migration repair
```

nem inserir registros manualmente em:

```text
supabase_migrations.schema_migrations
```

sem diagnóstico e autorização explícita.

## Baseline

O projeto deve futuramente definir e documentar um **baseline oficial do ambiente remoto**, identificando:

- qual migration foi efetivamente utilizada como ponto de partida do ambiente remoto;
- quais migrations posteriores já foram aplicadas funcionalmente;
- quais migrations precisam apenas ser registradas no histórico;
- quais migrations ainda precisam ser executadas.

Até essa regularização, o histórico remoto deve ser tratado como **incompleto em relação ao repositório**.

## Procedimento temporário

Para uma nova migration `dbXXX`:

```text
migration local nova
        ↓
verificar migration list --linked
        ↓
existem migrations antigas pendentes?
        ↓
      SIM
        ↓
diagnosticar estado real do remoto
        ↓
determinar se são aplicadas / parciais / não aplicadas
        ↓
definir estratégia segura
        ↓
aplicar somente o necessário
```

O objetivo é evitar que a cada nova migration o mesmo problema de histórico seja redescoberto.

## Contexto identificado em setembro de 2026

Durante a preparação da migration `20260928_db080_rbac_admin_full.sql`, foi confirmado que o histórico remoto não contém toda a sequência de migrations existente no repositório.

O `supabase db push --linked --dry-run` identificou migrations anteriores como pendentes, incluindo migrations de autorização/RBAC e RLS, apesar de o banco remoto já possuir objetos correspondentes a essas áreas.

Por esse motivo, a `db080` **não deve ser aplicada através de um `db push` indiscriminado** até que o baseline remoto seja formalmente entendido.

A existência deste desfasamento é uma condição conhecida do ambiente e deve ser considerada em todos os futuros deploys.

## Escopo

Esta regra aplica-se exclusivamente ao projeto:

**OSFlow / crm-angariacao**

Não alterar ou aplicar esta regra automaticamente a OSFacility, OSPlataform ou outros projetos.
