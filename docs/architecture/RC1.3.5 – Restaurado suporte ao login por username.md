# RC1.3.5 – Restaurado suporte ao login por username

**Data:** 31/07/2026

---

# Objetivo

Restaurar o suporte ao login através de **username**, preservando integralmente a arquitetura de autenticação implementada na RC1.3.4.

A autenticação continua a ser efetuada exclusivamente pelo **Supabase Auth** através do email, sendo o username utilizado apenas como identificador de conveniência para o utilizador.

---

# Problema identificado

Após as correções de autenticação da RC1.3.4, o login por username deixou de funcionar.

### Causa

A função `resolveLoginEmail()` realizava uma consulta direta à tabela `usuarios` antes da autenticação.

Com a implementação de **RLS (Row Level Security)** na tabela `usuarios`, utilizadores anónimos deixaram de possuir permissões de leitura, impedindo a resolução do email necessário para autenticação.

---

# Solução implementada

## Backend (Supabase)

Criação da função RPC:

```sql
public.resolve_login_email(p_login text)
```

Características:

- `SECURITY DEFINER`
- `STABLE`
- `search_path` definido para `public`
- Permissão `EXECUTE` para:
  - `anon`
  - `authenticated`

A função permite resolver o email associado ao username sem expor acesso direto à tabela `usuarios`, mantendo a compatibilidade com a RLS.

---

## Frontend

A função `resolveLoginEmail()` deixou de consultar diretamente a tabela `usuarios` e passou a utilizar:

```javascript
supabase.rpc("resolve_login_email", {
    p_login: login
});
```

A autenticação continua a utilizar:

```javascript
supabase.auth.signInWithPassword({
    email,
    password
});
```

Não foram efetuadas alterações no fluxo de autenticação após o login.

---

# Fluxo de autenticação

## Login por email

```
Utilizador
      │
      ▼
signInWithPassword(email, password)
```

---

## Login por username

```
Utilizador
      │
      ▼
resolve_login_email()
      │
      ▼
Email
      │
      ▼
signInWithPassword(email, password)
```

---

# Compatibilidade

Mantido integralmente:

- Bootstrap da sessão
- Hidratação do perfil
- Listener `onAuthStateChange`
- Fluxo implementado na RC1.3.4
- RBAC
- RLS

Nenhuma alteração foi realizada após a autenticação do utilizador.

---

# Segurança

A autenticação continua exclusivamente delegada ao **Supabase Auth**.

A função RPC expõe apenas o email correspondente ao username informado, não permitindo acesso direto à tabela `usuarios` nem disponibilizando informação adicional.

---

# Benefícios

- Restabelece o login por username.
- Mantém compatibilidade total com a RLS.
- Preserva a arquitetura de autenticação implementada na RC1.3.4.
- Evita consultas diretas à tabela `usuarios` por utilizadores não autenticados.
- Não introduz regressões no fluxo de autenticação.

---

# Homologação

Validado com sucesso:

- ✅ Login por email
- ✅ Login por username
- ✅ Logout
- ✅ Refresh (F5)
- ✅ Bootstrap da sessão
- ✅ RBAC
- ✅ RLS
- ✅ Carregamento da lista de utilizadores
- ✅ Compatibilidade com a RC1.3.4

---

# Observações

Esta implementação restaura a funcionalidade existente antes da RC1.3.4 sem comprometer a segurança introduzida pela Row Level Security.

A arquitetura permanece consistente:

- O utilizador pode autenticar-se utilizando email ou username.
- O Supabase continua a autenticar exclusivamente através do email.
- A resolução do username é efetuada por uma função RPC `SECURITY DEFINER`, compatível com as políticas de segurança da aplicação.