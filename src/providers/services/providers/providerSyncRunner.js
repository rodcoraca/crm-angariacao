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
    const API_URL =
      process.env.REACT_APP_PROVIDER_API_URL ||
      "http://localhost:3001";
    
    // Disparar sincronização na infraestrutura global isolada
    const response = await fetch(`${API_URL}/api/providers/imovirtual/sync`, {
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
