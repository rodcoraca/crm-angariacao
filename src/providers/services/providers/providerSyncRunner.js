import { supabase } from "../../../supabase";
import { resolveEmpresaId, warnMissingEmpresaId } from "../../../utils/empresaScope";
import { providerSyncEngine, SyncState } from "../../../shared/provider-engine/sync/ProviderSyncEngine";

const PROVIDER = "imovirtual";

/**
 * Runner intermediário para sincronização manual do Imovirtual.
 * Toda a comunicação de progresso é emitida através do PSE (ADR-003).
 */
export async function runImovirtualSync(config = {}) {
  const startedAt = new Date().toISOString();

  providerSyncEngine.emit(SyncState.PREPARING, PROVIDER, { startedAt, ...config });

  console.log("[SYNC]", {
    phase: "runImovirtualSync_start",
    timestamp: startedAt
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
      providerSyncEngine.emit(SyncState.FAILED, PROVIDER, {
        startedAt,
        finishedAt: new Date().toISOString(),
        error: "Operacao sem empresa_id"
      });
      throw new Error("Operacao sem empresa_id");
    }

    providerSyncEngine.emit(SyncState.CONNECTING, PROVIDER, { startedAt });
    providerSyncEngine.emit(SyncState.FETCHING, PROVIDER, { startedAt });

    console.log("[ProviderSync][SEARCH]", {
      provider: PROVIDER,
      districts: config.districts,
      includePrivateOwners: config.includePrivateOwners,
      includeProfessionalOwners: config.includeProfessionalOwners
    });

    const { data, error } = await supabase.functions.invoke("provider-sync", {
      body: {
        provider: PROVIDER,
        empresaId,
        ...config
      }
    });

    if (error) {
      providerSyncEngine.emit(SyncState.FAILED, PROVIDER, {
        startedAt,
        finishedAt: new Date().toISOString(),
        error: error.message
      });
      throw new Error(error.message || "Provider Sync indisponível.");
    }

    if (!data || data.success !== true) {
      providerSyncEngine.emit(SyncState.FAILED, PROVIDER, {
        startedAt,
        finishedAt: new Date().toISOString(),
        error: data?.message || "Provider Sync indisponível."
      });
      throw new Error(data?.message || "Provider Sync indisponível.");
    }

    const result = data;

    if (!result) {
      throw new Error("Provider Sync indisponível.");
    }

    const stats = {
      startedAt,
      processed:   result.discovered || 0,
      total:       result.discovered || 0,
      imported:    result.created    || 0,
      updated:     0,
      ignored:     result.skipped    || 0,
      errors:      (result.errors    || []).length,
      elapsedTime: result.executionSeconds || 0
    };

    providerSyncEngine.emit(SyncState.PROCESSING, PROVIDER, stats);
    providerSyncEngine.emit(SyncState.FINALIZING, PROVIDER, { ...stats, result });

    console.log("[SYNC]", {
      phase: "runImovirtualSync_success",
      timestamp: new Date().toISOString()
    });

    providerSyncEngine.emit(SyncState.COMPLETED, PROVIDER, {
      ...stats,
      finishedAt: new Date().toISOString(),
      result
    });
    return result;
  } catch (error) {
    if (providerSyncEngine.state !== SyncState.FAILED) {
      providerSyncEngine.emit(SyncState.FAILED, PROVIDER, {
        startedAt,
        finishedAt: new Date().toISOString(),
        error: error?.message || "Erro desconhecido"
      });
    }

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
