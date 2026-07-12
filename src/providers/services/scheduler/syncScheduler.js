import { syncProviders } from "./providerSyncService";

const SYNC_INTERVAL = 240 * 60 * 1000;

export function initScheduler() {
  // Executar imediatamente ao arranque
  syncProviders();
  
  // Agendar recorrência
  setInterval(syncProviders, SYNC_INTERVAL);
}
