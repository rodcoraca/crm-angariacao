import { supabase } from "../../../supabase";
import { resolveEmpresaId, warnMissingEmpresaId } from "../../../utils/empresaScope";
import { providerSyncEngine, SyncState } from "../../../shared/provider-engine/sync/ProviderSyncEngine";

const DEFAULT_PROVIDER = "imovirtual";

/**
 * Runner intermediário para sincronização manual do provider selecionado.
 * Toda a comunicação de progresso é emitida através do PSE (ADR-003).
 */
export async function runImovirtualSync(config = {}) {
  const provider = String(config?.provider || DEFAULT_PROVIDER).trim().toLowerCase();
  const validProviders = new Set(["imovirtual", "custojusto"]);

  if (!validProviders.has(provider)) {
    throw new Error("Provider selecionado não é válido.");
  }

  const startedAt = new Date().toISOString();

  providerSyncEngine.emit(SyncState.PREPARING, provider, { startedAt, ...config });

  console.log("[SYNC]", {
    phase: "runImovirtualSync_start",
    provider,
    timestamp: startedAt
  });

  try {
    const empresaId = await resolveEmpresaId();
    console.log("[SYNC]", {
      phase: "runImovirtualSync_empresa",
      provider,
      empresaId: empresaId || null,
      timestamp: new Date().toISOString()
    });
    if (!empresaId) {
      warnMissingEmpresaId();
      providerSyncEngine.emit(SyncState.FAILED, provider, {
        startedAt,
        finishedAt: new Date().toISOString(),
        error: "Operacao sem empresa_id"
      });
      throw new Error("Operacao sem empresa_id");
    }

    providerSyncEngine.emit(SyncState.CONNECTING, provider, { startedAt });
    providerSyncEngine.emit(SyncState.FETCHING, provider, { startedAt });

    console.log("[ProviderSync][SEARCH]", {
      provider,
      districts: config.districts,
      includePrivateOwners: config.includePrivateOwners,
      includeProfessionalOwners: config.includeProfessionalOwners
    });

    const { data, error } = await supabase.functions.invoke("provider-sync", {
      body: {
        ...config,
        provider,
        empresaId
      }
    });

    if (error) {
      providerSyncEngine.emit(SyncState.FAILED, provider, {
        startedAt,
        finishedAt: new Date().toISOString(),
        error: error.message
      });
      throw new Error(error.message || "Provider Sync indisponível.");
    }

    if (!data || data.success !== true) {
      providerSyncEngine.emit(SyncState.FAILED, provider, {
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

    providerSyncEngine.emit(SyncState.PROCESSING, provider, stats);
    providerSyncEngine.emit(SyncState.FINALIZING, provider, { ...stats, result });

    console.log("[SYNC]", {
      phase: "runImovirtualSync_success",
      provider,
      timestamp: new Date().toISOString()
    });

    providerSyncEngine.emit(SyncState.COMPLETED, provider, {
      ...stats,
      finishedAt: new Date().toISOString(),
      result
    });
    return result;
  } catch (error) {
    if (providerSyncEngine.state !== SyncState.FAILED) {
      providerSyncEngine.emit(SyncState.FAILED, provider, {
        startedAt,
        finishedAt: new Date().toISOString(),
        error: error?.message || "Erro desconhecido"
      });
    }

    console.log("[SYNC]", {
      phase: "runImovirtualSync_error",
      provider,
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
