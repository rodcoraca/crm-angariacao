import { requireEmpresaId, warnMissingEmpresaId } from "../tenant/empresaContext.js";

function toIsoOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function executeProviderSync({
  providerName,
  empresaId,
  listings,
  fetchedAt,
  supabaseClient,
  scoreCalculator,
  detectedAtFallbackNow = false
}) {
  let created = 0;
  let skipped = 0;
  const errors = [];

  console.log("[ProviderSync][Diagnostics] process_listings_start", {
    provider: providerName,
    empresaId: empresaId || null,
    received: Array.isArray(listings) ? listings.length : 0,
    fetchedAt: fetchedAt || null
  });

  if (!empresaId) {
    warnMissingEmpresaId();
    return {
      provider: providerName,
      empresaId: null,
      discovered: Array.isArray(listings) ? listings.length : 0,
      privateOwners: Array.isArray(listings) ? listings.filter((listing) => listing?.isPrivateOwner).length : 0,
      created: 0,
      skipped: 0,
      errors: [{ externalId: "*", error: "Operacao sem empresa_id" }]
    };
  }

  const scopedEmpresaId = requireEmpresaId(empresaId);

  for (const listing of listings) {
    const externalId = String(listing?.externalId || "").trim();
    if (!externalId) {
      errors.push({ externalId: "unknown", error: "externalId em falta no listing." });
      continue;
    }

    const { data: existing, error: checkError } = await supabaseClient
      .from("provider_leads")
      .select("id")
      .eq("empresa_id", scopedEmpresaId)
      .eq("provider", providerName)
      .eq("external_id", externalId)
      .maybeSingle();

    if (checkError) {
      errors.push({ externalId, error: checkError.message });
      continue;
    }

    if (existing) {
      skipped += 1;
      continue;
    }

    const score = typeof scoreCalculator === "function"
      ? scoreCalculator(listing)
      : undefined;

    const payload = {
      empresa_id: scopedEmpresaId,
      provider: providerName,
      external_id: externalId,
      title: listing.title || null,
      price: listing.price ?? null,
      location: [listing.city, listing.district].filter(Boolean).join(", ") || null,
      url: listing.url || null,
      area: listing.area ?? null,
      rooms: listing.rooms ?? null,
      city: listing.city || null,
      district: listing.district || null,
      owner_name: listing.ownerName || null,
      is_private_owner: Boolean(listing.isPrivateOwner),
      created_at_first: toIsoOrNull(listing.createdAtFirst),
      short_description: listing.shortDescription || null,
      source: listing.source || null,
      status: "new",
      detected_at: toIsoOrNull(fetchedAt) || (detectedAtFallbackNow ? new Date().toISOString() : null),
      raw_data: listing
    };

    if (score !== undefined) {
      payload.score = score;
    }

    const { error: insertError } = await supabaseClient
      .from("provider_leads")
      .insert([payload]);

    if (insertError) {
      errors.push({ externalId, error: insertError.message });
    } else {
      created += 1;
    }
  }

  const result = {
    provider: providerName,
    empresaId: scopedEmpresaId,
    discovered: listings.length,
    privateOwners: listings.filter((listing) => listing?.isPrivateOwner).length,
    created,
    skipped,
    errors
  };

  console.log("[ProviderSync][Diagnostics] process_listings_end", {
    provider: providerName,
    discovered: result.discovered,
    created: result.created,
    skipped: result.skipped,
    errors: result.errors.length
  });

  return result;
}
