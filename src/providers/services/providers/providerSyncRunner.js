import { supabase } from "../../../supabase";
import { resolveEmpresaId, warnMissingEmpresaId } from "../../../utils/empresaScope";

/**
 * Runner intermediário para sincronização manual do Imovirtual.
 * Não altera a arquitetura ou os serviços existentes.
 * 
 * ATUALIZAÇÃO: Delega a execução para Supabase Edge Function
 */
export async function runImovirtualSync() {
  console.log("[SYNC]", {
    phase: "runImovirtualSync_start",
    timestamp: new Date().toISOString()
  });

  try {
    const empresaId = await resolveEmpresaId();
    console.log("[SYNC]", {
      phase: "runImovirtualSync_empresa",
      empresaId: empresaId || null,
      timestamp: new Date().toISOString()
    });
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

    console.log("[SYNC]", {
      phase: "runImovirtualSync_success",
      timestamp: new Date().toISOString()
    });
    return data;
  } catch (error) {
    console.log("[SYNC]", {
      phase: "runImovirtualSync_error",
      error: error?.message || "Erro desconhecido",
      timestamp: new Date().toISOString()
    });
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
