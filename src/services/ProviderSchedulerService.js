import { supabase } from "../supabase";
import { getProvider } from "../providerRegistry";
import { BaseProvider } from "./BaseProvider";
import { RadarRepository } from "../modules/radar/repositories/RadarRepository";

const providersRegistry = {
  imovirtual: {
    sync: async () => {
      console.log("[Provider] Iniciando sincronização via RadarRepository...");
      const repo = new RadarRepository();
      // O listOpportunities já busca leads e realiza o merge necessário
      return await repo.listOpportunities();
    }
  }
};

export class ProviderSchedulerService {
  /**
   * Serviço global responsável pela orquestração dos providers.
   *
   * Pode ser executado por:
   *
   * - Edge Functions
   * - Scheduled Functions
   * - Cron externo
   * - Windows Task Scheduler
   *
   * Não contém regras específicas de providers.
   */
  async runPendingProviders() {
    const { data: providers, error } = await supabase
      .from("provider_registry")
      .select("*")
      .eq("enabled", true)
      .eq("sync_running", false);

    if (error) {
      console.error(
        "[ProviderScheduler] Erro ao carregar providers:",
        error
      );

      return {
        success: false,
        error
      };
    }

    const now = new Date();

    const pendingProviders = (providers || []).filter(
      (provider) =>
        !provider.next_execution ||
        new Date(provider.next_execution) <= now
    );

    const result = [];

    for (const provider of pendingProviders) {
      console.log(
        `[ProviderScheduler] Preparando execução: ${provider.provider_code}`
      );

      await this.markAsRunning(provider.provider_code);

      try {
        const handler = providersRegistry[provider.provider_code];
        if (handler) {
          await handler.sync();
          result.push({
            provider: provider.provider_code,
            success: true,
            executed: true
          });
        } else {
          console.warn(`[ProviderScheduler] Provider ${provider.provider_code} não implementado.`);
          result.push({
            provider: provider.provider_code,
            success: false,
            executed: false,
            error: "Provider não implementado"
          });
        }
      } catch (error) {
        await this.handleError(
          provider.provider_code,
          error
        );

        result.push({
          provider: provider.provider_code,
          success: false,
          error:
            error?.message || String(error)
        });
      } finally {
        await this.markAsIdle(provider);
      }
    }

    return {
      success: true,
      total: pendingProviders.length,
      providers: result
    };
  }

  async markAsRunning(providerCode) {
    await supabase
      .from("provider_registry")
      .update({
        sync_running: true,
        last_started_at:
          new Date().toISOString()
      })
      .eq(
        "provider_code",
        providerCode
      );
  }

  async markAsIdle(provider) {
    const interval =
      provider.interval_minutes || 240;

    const nextExecution =
      new Date(
        Date.now() +
          interval * 60 * 1000
      ).toISOString();

    await supabase
      .from("provider_registry")
      .update({
        sync_running: false,
        last_execution:
          new Date().toISOString(),
        next_execution:
          nextExecution,
        total_runs:
          (provider.total_runs || 0) + 1,
        last_error: null
      })
      .eq(
        "provider_code",
        provider.provider_code
      );
  }

  async handleError(
    providerCode,
    error
  ) {
    const {
      data: provider
    } = await supabase
      .from("provider_registry")
      .select("total_errors")
      .eq(
        "provider_code",
        providerCode
      )
      .single();

    await supabase
      .from("provider_registry")
      .update({
        sync_running: false,
        last_error:
          error?.message ||
          String(error),
        total_errors:
          (provider?.total_errors || 0) + 1
      })
      .eq(
        "provider_code",
        providerCode
      );
  }
}

export default new ProviderSchedulerService();