import { supabase } from "../../src/supabase.js";
import { executeProviderSync } from "../../src/shared/provider-engine/index.js";

/**
 * Executor global para sincronização de providers na infraestrutura API Node.
 * Escreve diretamente em provider_leads preservando o mapeamento.
 */
export class ProviderSyncExecutor {
  constructor(providerName = "imovirtual") {
    this.providerName = providerName;
  }

  async processListings(listings, fetchedAt, syncStartedAtMs = Date.now()) {
    const empresaId = String(process.env.OSFLOW_EMPRESA_ID || "").trim() || null;

    return executeProviderSync({
      providerName: this.providerName,
      empresaId,
      listings,
      fetchedAt,
      supabaseClient: supabase,
      syncStartedAtMs
    });
  }
}
