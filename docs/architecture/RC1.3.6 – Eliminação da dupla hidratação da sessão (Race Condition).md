# RC1.3.6 – Eliminação da dupla hidratação da sessão (Race Condition)

## Contexto

Após a RC1.3.5 foi identificado um comportamento intermitente:

- Login entra em loop.
- O utilizador permanece na página de login.
- Um simples F5 autentica corretamente.
- O SDK do Supabase apresenta:

```
Lock "lock:sb-...-auth-token" was not released within 5000ms
```

O diagnóstico identificou uma race condition entre duas chamadas concorrentes de `hydrateSessionFromAuth()`.

---

# Objetivo

Eliminar definitivamente a dupla hidratação da sessão.

A arquitetura deve passar a garantir que **apenas uma hidratação pode existir em simultâneo**, independentemente da origem (bootstrap, login ou onAuthStateChange).

---

# IMPORTANTE

Antes de alterar qualquer código:

1. Confirmar o diagnóstico.
2. Confirmar que a alteração não provoca regressão da RC1.3.4 nem da RC1.3.5.
3. Se existir qualquer dúvida, parar e justificar.

Não implementar soluções paliativas.

Não introduzir timeouts artificiais.

Não remover listeners do Supabase.

Não alterar o fluxo de autenticação do Supabase.

---

# Diagnóstico identificado

Hoje existem duas hidratações concorrentes.

Fluxo A

```
Login.js
    ↓
signInWithPassword()
    ↓
handleLogin()
    ↓
hydrateSessionFromAuth()
```

Fluxo B

```
Supabase
    ↓
SIGNED_IN
    ↓
onAuthStateChange()
    ↓
hydrateSessionFromAuth()
```

Ambas correm em paralelo.

Ambas:

- carregam perfil
- carregam RBAC
- reconciliam utilizador
- alteram authReady
- alteram authzReady
- alteram user

Resultado:

- loops de login
- locks do GoTrue
- múltiplas queries
- F5 resolve o problema

---

# Implementação pretendida

Existe apenas **uma única hidratação ativa**.

O mecanismo existente (`hydrationInFlightRef`) deverá ser o único responsável pela coordenação.

Se já existir uma hidratação em curso:

- reutilizar essa Promise;
- nunca iniciar uma segunda.

---

## Rever especialmente

App.jsx

- handleLogin()
- bootstrapAuthSession()
- hydrateSessionFromAuth()
- onAuthStateChange()

---

## Objetivo arquitetural

O login não deverá hidratar a sessão diretamente se essa hidratação já tiver sido iniciada pelo listener do Supabase.

O estado da aplicação deverá convergir para:

```
signInWithPassword()

↓

SIGNED_IN

↓

uma única hydrateSessionFromAuth()

↓

perfil

↓

RBAC

↓

setUser()

↓

App autenticada
```

Nunca:

```
signIn()

↓

hydrate()

+

SIGNED_IN

↓

hydrate()
```

---

# Critérios de aceitação

Deve existir apenas uma execução de:

- hydrateSessionFromAuth
- loadAuthorizationProfileByAuthUserId
- reconcilePendingActivation

por autenticação.

---

Devem funcionar:

✅ Login por email

✅ Login por username

✅ Logout

✅ Refresh (F5)

✅ Recuperação automática da sessão

✅ Bootstrap

✅ RBAC

✅ RLS

---

Não pode existir:

- loop de login
- múltiplos signOut()
- múltiplas hidratações
- warnings do tipo

```
Lock "sb-...auth-token"
```

originados por concorrência interna.

---

# Entrega

Antes de alterar código:

1. Confirmar se o diagnóstico está correto.
2. Identificar exatamente o ponto onde a segunda hidratação é iniciada.
3. Explicar por que motivo a alteração não introduz regressões na RC1.3.4 nem na RC1.3.5.
4. Só depois implementar a correção mínima necessária.

No final apresentar:

- ficheiros alterados;
- sequência antiga;
- sequência nova;
- justificação técnica.