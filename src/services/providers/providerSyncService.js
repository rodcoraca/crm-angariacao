export const syncState = {
  lastSyncAt: null,
  nextSyncAt: null,
  status: 'idle', // idle, running, error
};

let isRunning = false;

export async function syncProviders() {
  if (isRunning) {
    console.log("[ProviderSync] Sync already in progress.");
    return;
  }

  isRunning = true;
  syncState.status = 'running';
  
  try {
    console.log("[ProviderSync] Starting synchronization...");
    
    // Lista de providers ativos (extensível para OLX, Idealista)
    const activeProviders = ['imovirtual'];

    for (const provider of activeProviders) {
      // Nota: A lógica de fetch real será integrada conforme repositório atual
      console.log(`[ProviderSync] Processing ${provider}...`);
      // Simulação de processamento de novos listings
    }

    syncState.lastSyncAt = new Date();
    syncState.status = 'idle';
    console.log("[ProviderSync] Finished successfully.");
  } catch (error) {
    syncState.status = 'error';
    console.error("[ProviderSync] Error during sync:", error);
  } finally {
    isRunning = false;
    syncState.nextSyncAt = new Date(Date.now() + 240 * 60 * 1000);
  }
}
