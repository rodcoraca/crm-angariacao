import { supabase } from "../../../supabase";
import { resolveEmpresaId, warnMissingEmpresaId } from "../../../utils/empresaScope";

export async function getProviderSyncStatus(providerCode) {
  const empresaId = await resolveEmpresaId();

  if (!empresaId) {
    warnMissingEmpresaId();
    return null;
  }

  const { data, error } = await supabase
    .from("provider_registry")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("provider_code", providerCode)
    .maybeSingle();

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