export const LOCK_OWNER_PREFIX = "__lock_owner:";

export function createLockOwnerId(randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto)) {
  if (typeof randomUUID !== "function") {
    throw new Error("Não foi possível gerar a identidade do lock.");
  }

  return randomUUID();
}

export function buildLockOwnerMarker(ownerId) {
  return `${LOCK_OWNER_PREFIX}${ownerId}`;
}

export function parseLockOwnerMarker(value) {
  const marker = String(value || "");
  if (!marker.startsWith(LOCK_OWNER_PREFIX)) return null;

  const ownerId = marker.slice(LOCK_OWNER_PREFIX.length).trim();
  return ownerId || null;
}

export function isLockOwnerMarker(value, ownerId) {
  return parseLockOwnerMarker(value) === String(ownerId || "").trim();
}

export async function acquireProviderLock(client, {
  empresaId,
  provider,
  ownerId,
  nowIso
}) {
  return client
    .from("provider_registry")
    .update({
      sync_running: true,
      last_execution: nowIso,
      last_error: buildLockOwnerMarker(ownerId)
    })
    .eq("empresa_id", empresaId)
    .eq("provider_code", provider)
    .eq("sync_running", false)
    .select("provider_code,sync_running")
    .maybeSingle();
}

export async function releaseProviderLock(client, {
  empresaId,
  provider,
  ownerId,
  nextExecutionIso,
  success,
  errorMessage,
  nowIso
}) {
  return client
    .from("provider_registry")
    .update({
      sync_running: false,
      last_execution: nowIso,
      next_execution: nextExecutionIso,
      last_error: success ? null : (errorMessage || "Provider Sync indisponível.")
    })
    .eq("empresa_id", empresaId)
    .eq("provider_code", provider)
    .eq("sync_running", true)
    .eq("last_error", buildLockOwnerMarker(ownerId))
    .select("provider_code")
    .maybeSingle();
}