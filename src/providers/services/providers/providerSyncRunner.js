import { registerExecution } from "./providerSyncService";

/**
 * Runner intermediário para sincronização manual do Imovirtual.
 * Não altera a arquitetura ou os serviços existentes.
 * 
 * ATUALIZAÇÃO: Delega a execução para a API Global Node
 */
export async function runImovirtualSync() {
  await registerExecution("imovirtual", true);

  try {
    // Arquitetura definitiva:
    // Frontend
    // ↓
    // /api
    // ↓
    // Proxy
    // ↓
    // Node
    const response = await fetch("/api/providers/imovirtual/sync", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Falha no trigger Global API: ${response.statusText}`);
    }

    const result = await response.json();

    // c) Sucesso
    await registerExecution("imovirtual", false, 240);
    return result;
  } catch (error) {
    // d) Tratamento de erro
    await registerExecution("imovirtual", false, 0);
    throw error;
  }
}
