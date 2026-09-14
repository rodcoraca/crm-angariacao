import { supabase } from "../../../supabase";
import { resolveEmpresaId, warnMissingEmpresaId } from "../../../utils/empresaScope";

export async function getProviderSyncStatus(providerCode) {
  const statuses = await getProviderSyncStatuses([providerCode]);
  return statuses[String(providerCode || "").trim().toLowerCase()] || null;
}

export async function getProviderSyncStatuses(providerCodes = []) {
  const empresaId = await resolveEmpresaId();

  if (!empresaId) {
    warnMissingEmpresaId();
    return {};
  }

  const normalizedProviders = [...new Set(
    (providerCodes || []).map((provider) => String(provider || "").trim().toLowerCase()).filter(Boolean)
  )];
  if (normalizedProviders.length === 0) return {};

  const { data, error } = await supabase
    .from("provider_registry")
    .select("*")
    .eq("empresa_id", empresaId)
    .in("provider_code", normalizedProviders);

  if (error) {
    console.error(
      "[providerSyncService] Erro ao obter estado:",
      error
    );
    return Object.fromEntries(normalizedProviders.map((provider) => [provider, createUnavailableStatus(provider)]));
  }

  const rowsByProvider = new Map((data || []).map((row) => [row.provider_code, row]));
  return Object.fromEntries(normalizedProviders.map((provider) => {
    const row = rowsByProvider.get(provider);
    return [provider, row ? normalizeSyncStatus(row) : createUnavailableStatus(provider)];
  }));
}

function createUnavailableStatus(providerCode) {
  return {
    provider_code: providerCode,
    canSync: true,
    remainingMs: 0,
    sync_running: false,
    next_execution: null,
    last_execution: null
  };
}

function normalizeSyncStatus(data) {
  const now = new Date();
  const nextExecution = data.next_execution ? new Date(data.next_execution) : null;
  const hasValidNextExecution = nextExecution && !Number.isNaN(nextExecution.getTime());
  const remainingMs = hasValidNextExecution && nextExecution > now
    ? nextExecution.getTime() - now.getTime()
    : 0;

  return {
    ...data,
    canSync: !data.sync_running && (!hasValidNextExecution || remainingMs <= 0),
    remainingMs
  };
}

export async function canExecuteSync(providerCode) {
  const status =
    await getProviderSyncStatus(providerCode);

  return status?.canSync ?? false;
}