import { supabase } from "../../../supabase";

export async function getProviderSyncStatus(providerCode) {
  const { data, error } = await supabase
    .from("provider_registry")
    .select("*")
    .eq("provider_code", providerCode)
    .single();

  if (error || !data) {
    console.error(
      "[providerSyncService] Erro ao obter estado:",
      error
    );

    return null;
  }

  const now = new Date();
  const nextExecution = data.next_execution
    ? new Date(data.next_execution)
    : null;

  const remainingMs =
    nextExecution && nextExecution > now
      ? nextExecution.getTime() - now.getTime()
      : 0;

  return {
    ...data,
    canSync: remainingMs <= 0 && !data.sync_running,
    remainingMs
  };
}

export async function canExecuteSync(providerCode) {
  const status =
    await getProviderSyncStatus(providerCode);

  return status?.canSync ?? false;
}

export async function registerExecution(
  providerCode,
  syncRunning = false,
  intervalMinutes = 240
) {
  const now = new Date();

  const nextExecution = new Date(
    now.getTime() +
      intervalMinutes * 60 * 1000
  );

  const { error } = await supabase
    .from("provider_registry")
    .update({
      sync_running: syncRunning,
      last_execution: now.toISOString(),
      next_execution:
        nextExecution.toISOString()
    })
    .eq("provider_code", providerCode);

  if (error) {
    console.error(
      "[providerSyncService] Erro ao atualizar:",
      error
    );
  }

  return !error;
}