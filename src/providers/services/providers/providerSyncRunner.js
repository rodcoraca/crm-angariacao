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

  providerSyncEngine.emit(SyncState.PREPARING, PROVIDER, { startedAt });

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

    console.log("[SYNC] invoke body", {
      provider: PROVIDER,
      empresaId,
      ...config
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

    if (!data?.success) {
      providerSyncEngine.emit(SyncState.FAILED, PROVIDER, {
        startedAt,
        finishedAt: new Date().toISOString(),
        error: data?.message
      });
      throw new Error(data?.message || "Provider Sync indisponível.");
    }

    const stats = {
      startedAt,
      processed:   data.discovered || 0,
      total:       data.discovered || 0,
      imported:    data.created    || 0,
      updated:     0,
      ignored:     data.skipped    || 0,
      errors:      (data.errors    || []).length,
      elapsedTime: data.executionSeconds || 0
    };

    providerSyncEngine.emit(SyncState.PROCESSING, PROVIDER, stats);
    providerSyncEngine.emit(SyncState.FINALIZING, PROVIDER, { ...stats, result: data });

    console.log("[SYNC]", {
      phase: "runImovirtualSync_success",
      timestamp: new Date().toISOString()
    });

    providerSyncEngine.emit(SyncState.COMPLETED, PROVIDER, {
      ...stats,
      finishedAt: new Date().toISOString(),
      result: data
    });
    return data;
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
