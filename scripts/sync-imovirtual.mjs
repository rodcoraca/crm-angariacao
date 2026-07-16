import ImovirtualProvider from "../src/providers/ImovirtualProvider.js";
import { ProviderSyncExecutor } from "../src/providers/node/ProviderSyncExecutor.js";
import { registerExecution } from "../src/providers/services/providers/providerSyncService.js";
import { collectImovirtualPaginatedListings } from "../src/shared/provider-engine/index.js";

const MAX_PAGES = 20;

async function runSync() {
  console.log("Iniciando sincronização Node para Imovirtual...");
  const syncStartedAtMs = Date.now();
  
  // 1. Atualizar provider_registry (início)
  await registerExecution("imovirtual", true);
  
  const provider = new ImovirtualProvider({ enableLogs: true });
  const executor = new ProviderSyncExecutor();
  
  try {
    const paginated = await collectImovirtualPaginatedListings({
      maxPages: MAX_PAGES,
      fetchPage: (page) => provider.fetchSearchPage({ district: "porto", page }),
      onPage: ({ page, found, totalPages }) => {
        console.log("[Sync][RC1.0.1] page_progress", {
          paginaAtual: page,
          anunciosEncontrados: found,
          ultimaPagina: totalPages
        });
      }
    });

    const { listings, fetchedAt } = paginated;
    
    console.log(`[Sync] ${listings.length} oportunidades encontradas. Processando...`);
    
    // 2. Persistir anúncios em provider_leads verificando duplicados (provider + external_id)
    const result = await executor.processListings(listings, fetchedAt, syncStartedAtMs);

    console.log("[Sync][RC1.0.1] execution_summary", {
      paginasProcessadas: paginated.pagesProcessed,
      criterioParagem: paginated.stopReason,
      anunciosEncontrados: listings.length,
      novos: result.created,
      duplicados: result.skipped,
      tempoTotalSegundos: Number(((Date.now() - syncStartedAtMs) / 1000).toFixed(2))
    });

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
