import { requireEmpresaId, warnMissingEmpresaId } from "../tenant/empresaContext.js";

const PRIVATE_OWNER_WINDOW_DAYS = 30;
const AGENCY_WINDOW_DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

// Estrategia Beta:
//
// Particular:
// janela de 30 dias
// devido ao maior valor comercial
// e necessidade de recuperacao apos downtime.
//
// Agencia:
// janela de 7 dias
// para reduzir volume de processamento.
//
// Deduplicacao por:
// provider + external_id.
//
// Arquitetura futura:
// tornar janelas configuraveis por empresa
// no modulo SaaS.
function isListingWithinWindow(listing, referenceDate) {
  const publishedAt = toDateOrNull(listing?.createdAtFirst);
  if (!publishedAt) return false;

  const maxWindowDays = listing?.isPrivateOwner === true
    ? PRIVATE_OWNER_WINDOW_DAYS
    : AGENCY_WINDOW_DAYS;

  const ageMs = referenceDate.getTime() - publishedAt.getTime();
  if (ageMs < 0) return true;

  return ageMs <= (maxWindowDays * DAY_IN_MS);
}

async function updateExistingListing({ supabaseClient, scopedEmpresaId, providerName, externalId, listing }) {
  const nowIso = new Date().toISOString();
  const updatePayload = {
    price: listing.price ?? null,
    short_description: listing.shortDescription || null,
    owner_name: listing.ownerName || null,
    updated_at: nowIso,
    imported_at: nowIso
  };

  const baseUpdateQuery = supabaseClient
    .from("provider_leads")
    .update(updatePayload)
    .eq("empresa_id", scopedEmpresaId)
    .eq("provider", providerName)
    .eq("external_id", externalId);

  const { error } = await baseUpdateQuery;
  if (!error) {
    return null;
  }

  const importedAtMissing = /imported_at/i.test(String(error.message || ""));
  if (!importedAtMissing) {
    return error;
  }

  const fallbackPayload = {
    price: updatePayload.price,
    short_description: updatePayload.short_description,
    owner_name: updatePayload.owner_name,
    updated_at: updatePayload.updated_at
  };

  const { error: fallbackError } = await supabaseClient
    .from("provider_leads")
    .update(fallbackPayload)
    .eq("empresa_id", scopedEmpresaId)
    .eq("provider", providerName)
    .eq("external_id", externalId);

  return fallbackError || null;
}

export async function executeProviderSync({
  providerName,
  empresaId,
  listings,
  fetchedAt,
  supabaseClient,
  scoreCalculator,
  detectedAtFallbackNow = false,
  syncStartedAtMs = Date.now()
}) {
  const startedAtMs = Number.isFinite(syncStartedAtMs) ? syncStartedAtMs : Date.now();
  const referenceDate = toDateOrNull(fetchedAt) || new Date();
  const receivedListings = Array.isArray(listings) ? listings : [];
  const eligibleListings = receivedListings.filter((listing) => isListingWithinWindow(listing, referenceDate));
  const analyzedPrivateOwners = eligibleListings.filter((listing) => listing?.isPrivateOwner === true).length;
  const analyzedAgencies = eligibleListings.length - analyzedPrivateOwners;

  let created = 0;
  let skipped = 0;
  const errors = [];

  console.log("[ProviderSync][Diagnostics] process_listings_start", {
    provider: providerName,
    empresaId: empresaId || null,
    received: receivedListings.length,
    eligibleByWindow: eligibleListings.length,
    filteredByWindow: receivedListings.length - eligibleListings.length,
    fetchedAt: fetchedAt || null
  });

  if (!empresaId) {
    warnMissingEmpresaId();
    return {
      provider: providerName,
      empresaId: null,
      discovered: eligibleListings.length,
      privateOwners: analyzedPrivateOwners,
      analyzedPrivateOwners,
      analyzedAgencies,
      filteredByWindow: receivedListings.length - eligibleListings.length,
      created: 0,
      skipped: 0,
      executionSeconds: Number(((Date.now() - startedAtMs) / 1000).toFixed(2)),
      errors: [{ externalId: "*", error: "Operacao sem empresa_id" }]
    };
  }

  const scopedEmpresaId = requireEmpresaId(empresaId);

  for (const listing of eligibleListings) {
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
      const updateError = await updateExistingListing({
        supabaseClient,
        scopedEmpresaId,
        providerName,
        externalId,
        listing
      });

      if (updateError) {
        errors.push({ externalId, error: updateError.message });
      }

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

  const executionSeconds = Number(((Date.now() - startedAtMs) / 1000).toFixed(2));

  const result = {
    provider: providerName,
    empresaId: scopedEmpresaId,
    discovered: eligibleListings.length,
    privateOwners: analyzedPrivateOwners,
    analyzedPrivateOwners,
    analyzedAgencies,
    filteredByWindow: receivedListings.length - eligibleListings.length,
    created,
    skipped,
    executionSeconds,
    errors
  };

  console.log("[ProviderSync][Diagnostics] process_listings_end", {
    provider: providerName,
    discovered: result.discovered,
    created: result.created,
    skipped: result.skipped,
    errors: result.errors.length
  });

  console.log("------------------------------------------------");
  console.log("Imovirtual Sync Summary");
  console.log("");
  console.log(`Particulares analisados: ${result.analyzedPrivateOwners}`);
  console.log("");
  console.log(`Agencias analisadas: ${result.analyzedAgencies}`);
  console.log("");
  console.log(`Novos anuncios: ${result.created}`);
  console.log("");
  console.log(`Duplicados ignorados: ${result.skipped}`);
  console.log("");
  console.log(`Tempo execucao: ${result.executionSeconds} segundos`);
  console.log("------------------------------------------------");

  return result;
}
