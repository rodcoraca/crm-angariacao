import { registerExecution } from "./providerSyncService";
import { supabase } from "../../../supabase";
import { resolveEmpresaId, warnMissingEmpresaId } from "../../../utils/empresaScope";

/**
 * Runner intermediário para sincronização manual do Imovirtual.
 * Não altera a arquitetura ou os serviços existentes.
 * 
 * ATUALIZAÇÃO: Delega a execução para Supabase Edge Function
 */
export async function runImovirtualSync() {
  await registerExecution("imovirtual", true);

  try {
    const empresaId = await resolveEmpresaId();
    if (!empresaId) {
      warnMissingEmpresaId();
      throw new Error("Operacao sem empresa_id");
    }

    const { data, error } = await supabase.functions.invoke("provider-sync", {
      body: {
        provider: "imovirtual",
        empresaId
      }
    });

    if (error) {
      throw new Error(error.message || "Provider Sync indisponível.");
    }

    if (!data?.success) {
      throw new Error(data?.message || "Provider Sync indisponível.");
    }

    // c) Sucesso
    await registerExecution("imovirtual", false, 240);
    return data;
  } catch (error) {
    // d) Tratamento de erro
    await registerExecution("imovirtual", false, 0);
    const fallbackResult = {
      success: false,
      fallback: true,
      message: "Provider Sync indisponível.",
      error: error?.message || "Erro desconhecido"
    };

    const controlledError = new Error(fallbackResult.message);
    controlledError.fallback = fallbackResult;
    throw controlledError;
  }
}
