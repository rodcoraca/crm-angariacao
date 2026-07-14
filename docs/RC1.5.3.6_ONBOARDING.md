# RC1.5.3.6 - Fluxo Definitivo de Onboarding e Ativacao

Data: 2026-07-14
Estado: Implementado

## Objetivo
Unificar o onboarding administrativo para envio exclusivo de convite (`Invite User`) e eliminar estados intermediarios de sessao apos definicao de password.

## Fluxo Final
1. Administrador cria utilizador.
2. Registo em `usuarios` fica com `account_status = pending_activation`.
3. Sistema envia apenas convite Supabase (`type=invite`).
4. Utilizador abre link de convite (`type=invite`) e define nova password.
5. Aplicacao executa `supabase.auth.updateUser({ password })`.
6. Aplicacao termina sessao (`signOut`), limpa `localStorage` e `sessionStorage` e redireciona para `/login`.
7. Primeiro acesso passa a ser login manual.
8. No primeiro login:
- carrega perfil por `auth_user_id`;
- se nao encontrar, procura por email;
- se encontrar, reconcilia `usuarios.auth_user_id = auth_user.id`;
- segue bootstrap normal.
9. Se `email_confirmed_at != null` e `usuarios.account_status = pending_activation`, ativa automaticamente com `markUserAccountActive()`.

## Regras de Seguranca e Consistencia
- Proibido `signUp` no fluxo administrativo.
- Proibido login automatico apos definicao de password.
- Nao executar bootstrap completo durante modo de definicao de password (`type=invite` ou `type=recovery`).

## Escopo Preservado
- RBAC
- Multi-tenant
- empresa_id
- Auditoria
- UX principal

## SQL
Sem alteracoes SQL para RC1.5.3.6.
