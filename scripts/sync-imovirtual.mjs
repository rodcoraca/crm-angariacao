import ImovirtualProvider from "../src/providers/ImovirtualProvider.js";
import { extractListings, extractNextData } from "../src/providers/ImovirtualProvider.js";
import { ProviderSyncExecutor } from "../src/providers/node/ProviderSyncExecutor.js";
import { registerExecution } from "../src/providers/services/providers/providerSyncService.js";

async function runSync() {
  console.log("Iniciando sincronização Node para Imovirtual...");
  
  // 1. Atualizar provider_registry (início)
  await registerExecution("imovirtual", true);
  
  const provider = new ImovirtualProvider({ enableLogs: true });
  const executor = new ProviderSyncExecutor();
  
  try {
    const { html, fetchedAt } = await provider.fetchSearchPage({ district: "porto", page: 1 });
    const listings = extractListings(extractNextData(html));
    
    console.log(`[Sync] ${listings.length} oportunidades encontradas. Processando...`);
    
    // 2. Persistir anúncios em provider_leads verificando duplicados (provider + external_id)
    const result = await executor.processListings(listings, fetchedAt);
    console.log("Sincronização concluída:", result);
    
    // 3. Atualizar provider_registry (sucesso - próximo run em 240 min)
    await registerExecution("imovirtual", false, 240);
  } catch (error) {
    console.error("Erro na sincronização:", error);
    // Atualizar provider_registry (falha - libera bloqueio)
    await registerExecution("imovirtual", false, 0);
    process.exit(1);
  }
}

runSync();
