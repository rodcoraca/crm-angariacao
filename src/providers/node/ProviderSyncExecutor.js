import { supabase } from "../../../supabase.js";

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
    let created = 0;
    let skipped = 0;
    const errors = [];

    for (const listing of listings) {
      // 1. Verifica se já existe
      const { data: existing, error: checkError } = await supabase
        .from('provider_leads')
        .select('id')
        .eq('provider', this.providerName)
        .eq('external_id', listing.externalId)
        .maybeSingle();

      if (checkError) {
        errors.push({ externalId: listing.externalId, error: checkError.message });
        continue;
      }

      if (existing) {
        skipped += 1;
        continue;
      }

      // Validação defensiva de datas provenientes do provider
      const isValidDate = (dateString) => {
        if (!dateString) return null;
        const parsed = new Date(dateString);
        return !isNaN(parsed.getTime()) ? parsed.toISOString() : null;
      };

      // 2. Insere novo registo respeitando o mapeamento atual
      const payload = {
        provider: this.providerName,
        external_id: listing.externalId,
        title: listing.title,
        price: listing.price,
        location: [listing.city, listing.district].filter(Boolean).join(", ") || null,
        url: listing.url,
        area: listing.area,
        rooms: listing.rooms,
        city: listing.city,
        district: listing.district,
        owner_name: listing.ownerName,
        is_private_owner: listing.isPrivateOwner,
        created_at_first: isValidDate(listing.createdAtFirst),
        short_description: listing.shortDescription,
        source: listing.source,
        status: "new",
        detected_at: isValidDate(fetchedAt),
        raw_data: listing
      };

      const { error: insertError } = await supabase
        .from('provider_leads')
        .insert([payload]);

      if (insertError) {
        errors.push({ externalId: listing.externalId, error: insertError.message });
      } else {
        created += 1;
      }
    }

    return {
      provider: this.providerName,
      discovered: listings.length,
      privateOwners: listings.filter(l => l.isPrivateOwner).length,
      created,
      skipped,
      errors
    };
  }
}
