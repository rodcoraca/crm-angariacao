import { supabase } from "../../../supabase.js";
import { calcularScoreInteligente } from "../../modules/radar/services/radarScoreService.js";
import { executeProviderSync } from "../../shared/provider-engine/index.js";

/**
 * Executor isolado para sincronização de providers em ambiente Node.js.
 * Utiliza chamadas diretas ao Supabase para manter o provider_leads sem
 * depender das camadas de UI ou serviços acoplados ao browser.
 */
export class ProviderSyncExecutor {
  constructor(providerName = "imovirtual") {
    this.providerName = providerName;
  }

  async processListings(listings, fetchedAt) {
    const empresaId = String(process.env.OSFLOW_EMPRESA_ID || "").trim() || null;

    return executeProviderSync({
      providerName: this.providerName,
      empresaId,
      listings,
      fetchedAt,
      supabaseClient: supabase,
      scoreCalculator: (listing) => calcularScoreInteligente({
        created_at_first: listing.createdAtFirst,
        is_private_owner: listing.isPrivateOwner === true,
        distrito: listing.district,
        owner_name: listing.ownerName
      })
    });
  }
}
