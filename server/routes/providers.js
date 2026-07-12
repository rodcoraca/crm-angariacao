import express from 'express';
import ImovirtualProvider from '../../src/providers/ImovirtualProvider.js';
import { extractListings, extractNextData } from '../../src/providers/ImovirtualProvider.js';
import { ProviderSyncExecutor } from '../services/ProviderSyncExecutor.js';

const router = express.Router();

router.post('/:provider/sync', async (req, res) => {
  const { provider } = req.params;

  if (provider !== 'imovirtual') {
    return res.status(400).json({ error: 'Provider não suportado nesta fase.' });
  }

  console.log(`[API Global] Iniciando sincronização para: ${provider}`);

  try {
    const imovirtual = new ImovirtualProvider({ enableLogs: true });
    const executor = new ProviderSyncExecutor(provider);

    // Reutiliza a lógica homologada (extractNextData, extractListings)
    const { html, fetchedAt } = await imovirtual.fetchSearchPage({ district: "porto", page: 1 });
    const listings = extractListings(extractNextData(html));
    
    console.log(`[API Global] Encontrados ${listings.length} anúncios.`);

    const result = await executor.processListings(listings, fetchedAt);

    console.log(`[API Global] Sincronização concluída:`, result);
    return res.status(200).json(result);
  } catch (error) {
    console.error(`[API Global] Falha na sincronização:`, error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
