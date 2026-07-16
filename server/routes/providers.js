import express from 'express';
import ImovirtualProvider from '../../src/providers/ImovirtualProvider.js';
import { collectImovirtualPaginatedListings } from '../../src/shared/provider-engine/index.js';
import { ProviderSyncExecutor } from '../services/ProviderSyncExecutor.js';

const router = express.Router();
const MAX_PAGES = 20;

// LEGADO: endpoint mantido apenas para homologação e fallback local.
// Arquitetura ativa em produção: Supabase Edge Function `provider-sync`.
router.post('/:provider/sync', async (req, res) => {
  const { provider } = req.params;

  if (provider !== 'imovirtual') {
    return res.status(400).json({ error: 'Provider não suportado nesta fase.' });
  }

  console.log(`[API Global][LEGACY] Iniciando sincronização para: ${provider}`);

  try {
    const syncStartedAtMs = Date.now();
    const imovirtual = new ImovirtualProvider({ enableLogs: true });
    const executor = new ProviderSyncExecutor(provider);

    const paginated = await collectImovirtualPaginatedListings({
      maxPages: MAX_PAGES,
      fetchPage: (page) => imovirtual.fetchSearchPage({ district: "porto", page }),
      onPage: ({ page, found, totalPages }) => {
        console.log("[API Global][RC1.0.1] page_progress", {
          paginaAtual: page,
          anunciosEncontrados: found,
          ultimaPagina: totalPages
        });
      }
    });

    const { listings, fetchedAt } = paginated;
    
    console.log(`[API Global] Encontrados ${listings.length} anúncios.`);

    const result = await executor.processListings(listings, fetchedAt, syncStartedAtMs);

    console.log("[API Global][RC1.0.1] execution_summary", {
      paginasProcessadas: paginated.pagesProcessed,
      criterioParagem: paginated.stopReason,
      anunciosEncontrados: listings.length,
      novos: result.created,
      duplicados: result.skipped,
      tempoTotalSegundos: Number(((Date.now() - syncStartedAtMs) / 1000).toFixed(2))
    });

    console.log(`[API Global] Sincronização concluída:`, result);
    return res.status(200).json(result);
  } catch (error) {
    console.error(`[API Global] Falha na sincronização:`, error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
