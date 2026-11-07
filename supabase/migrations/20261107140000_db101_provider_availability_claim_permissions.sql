-- DB-101: restringir acesso a claim_provider_availability_run.
-- Escopo exclusivo da RPC de disponibilidade.

BEGIN;

REVOKE EXECUTE ON FUNCTION
  public.claim_provider_availability_run(
    text,
    text,
    timestamptz,
    timestamptz
  )
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.claim_provider_availability_run(
    text,
    text,
    timestamptz,
    timestamptz
  )
TO service_role;

COMMIT;