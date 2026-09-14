import { requireEmpresaId, warnMissingEmpresaId } from "../tenant/empresaContext.js";
import { normalizePortugalLocalIsoToUtc } from "../providerLocalTime.js";

const PRIVATE_OWNER_WINDOW_DAYS = 30;
const AGENCY_WINDOW_DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const CONCURRENCY_LIMIT = 10;
const PORTUGUESE_MONTHS = new Map([
  ["janeiro", 0],
  ["fevereiro", 1],
  ["março", 2],
  ["abril", 3],
  ["maio", 4],
  ["junho", 5],
  ["julho", 6],
  ["agosto", 7],
  ["setembro", 8],
  ["outubro", 9],
  ["novembro", 10],
  ["dezembro", 11]
]);

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

function toPublishedAtIsoOrNull(value, referenceDate) {
  if (!value || !(referenceDate instanceof Date) || Number.isNaN(referenceDate.getTime())) return null;

  const directValue = toIsoOrNull(value);
  if (directValue) return directValue;

  const text = String(value).trim().toLowerCase().replace(/\s+/g, " ")
    .replace(/^para o topo\s+(?:a\s+)?/i, "");
  const relativeMatch = text.match(/^(hoje|ontem) às (\d{1,2}):(\d{2})$/u);
  if (relativeMatch) {
    const [, day, hourText, minuteText] = relativeMatch;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Lisbon",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(referenceDate);
    const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
    const localDate = new Date(Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(hourText),
      Number(minuteText)
    ));
    if (day === "ontem") localDate.setUTCDate(localDate.getUTCDate() - 1);
    const localIso = localDate.toISOString().replace("Z", "");
    return normalizePortugalLocalIsoToUtc(localIso);
  }

  const absoluteMatch = text.match(/^(\d{1,2}) de ([a-zç]+) de (\d{4})(?: às (\d{1,2}):(\d{2}))?$/u);
  if (!absoluteMatch) return null;

  const [, dayText, monthName, yearText, hourText = "0", minuteText = "0"] = absoluteMatch;
  const month = PORTUGUESE_MONTHS.get(monthName);
  if (month === undefined) return null;

  const localIso = new Date(Date.UTC(
    Number(yearText),
    month,
    Number(dayText),
    Number(hourText),
    Number(minuteText)
  )).toISOString().replace("Z", "");
  return normalizePortugalLocalIsoToUtc(localIso);
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

// Runs async task functions with at most `limit` concurrent executions.
async function runConcurrent(tasks, limit) {
  const results = new Array(tasks.length);
  const queue = tasks.map((task, i) => ({ task, i }));
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (queue.length > 0) {
      const { task, i } = queue.shift();
      results[i] = await task();
    }
  });
  await Promise.all(workers);
  return results;
}

export async function executeProviderSync({
  providerName,
  empresaId,
  listings,
  fetchedAt,
  supabaseClient,
  scoreCalculator,
  detectedAtFallbackNow = false,
  allowListingsWithoutCreatedAtFirst = false,
  existingProviderLeadIds = null,
  syncStartedAtMs = Date.now()
}) {
  const startedAtMs = Number.isFinite(syncStartedAtMs) ? syncStartedAtMs : Date.now();
  const syncStartedAtIso = new Date(startedAtMs).toISOString();
  const referenceDate = toDateOrNull(fetchedAt) || new Date();
  const receivedListings = Array.isArray(listings) ? listings : [];
  const eligibleListings = receivedListings.filter((listing) =>
    allowListingsWithoutCreatedAtFirst && !listing?.createdAtFirst
      ? true
      : isListingWithinWindow(listing, referenceDate)
  );
  const analyzedPrivateOwners = eligibleListings.filter((listing) => listing?.isPrivateOwner === true).length;
  const analyzedAgencies = eligibleListings.filter((listing) => listing?.isPrivateOwner === false).length;

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

  // Single batch lookup to identify all existing listings — eliminates per-listing SELECTs.
  const existingMap = new Map(); // externalId → provider_lead_id
  const listingByExtId = new Map(); // externalId → listing

  for (const listing of eligibleListings) {
    const externalId = String(listing?.externalId || "").trim();
    if (!externalId) {
      errors.push({ externalId: "unknown", error: "externalId em falta no listing." });
      continue;
    }
    listingByExtId.set(externalId, listing);
  }

  const knownExistingIds = existingProviderLeadIds instanceof Map
    ? existingProviderLeadIds
    : new Map();
  for (const [externalId, listing] of listingByExtId) {
    const providerLeadId = listing?.existingProviderLeadId || knownExistingIds.get(externalId);
    if (providerLeadId) existingMap.set(externalId, providerLeadId);
  }

  const validExternalIds = [...listingByExtId.keys()].filter((externalId) => !existingMap.has(externalId));

  // trivially ok when there is nothing to look up
  let lookupOk = validExternalIds.length === 0;

  if (validExternalIds.length > 0) {
    const { data: foundRows, error: lookupError } = await supabaseClient
      .from("provider_leads")
      .select("id, external_id")
      .eq("provider", providerName)
      .eq("empresa_id", scopedEmpresaId)
      .in("external_id", validExternalIds);

    if (lookupError) {
      for (const externalId of validExternalIds) {
        errors.push({ externalId, error: lookupError.message });
      }
    } else {
      lookupOk = true;
      for (const row of (foundRows || [])) {
        existingMap.set(row.external_id, row.id);
      }
    }
  }

  // Split listings only when lookup succeeded — prevents INSERT on lookup failure.
  const existingEntries = [];
  const newEntries = [];

  if (lookupOk) {
    for (const [externalId, listing] of listingByExtId) {
      if (existingMap.has(externalId)) {
        existingEntries.push({ externalId, listing, providerLeadId: existingMap.get(externalId) });
      } else {
        newEntries.push({ externalId, listing });
      }
    }
  }

  const junctionRows = [];
  const junctionNow = new Date().toISOString();

  // Existing listings are retained as duplicates and still contribute to the junction rows.
  if (existingEntries.length > 0) {
    const existingTasks = existingEntries.map(({ externalId, providerLeadId }) => async () => ({
      externalId,
      providerLeadId
    }));

    const existingResults = await runConcurrent(existingTasks, CONCURRENCY_LIMIT);

    for (const { externalId, providerLeadId } of existingResults) {
      skipped += 1;
      junctionRows.push({ empresa_id: scopedEmpresaId, provider_lead_id: providerLeadId, first_seen_at: syncStartedAtIso, created_at: junctionNow, updated_at: junctionNow });
    }
  }

  // Insert new listings with controlled concurrency.
  if (newEntries.length > 0) {
    const insertTasks = newEntries.map(({ externalId, listing }) => async () => {
      const score = typeof scoreCalculator === "function" ? scoreCalculator(listing) : undefined;
      const structuredLocation = [listing.city, listing.district].filter(Boolean).join(", ");
      const payload = {
        provider: providerName,
        empresa_id: scopedEmpresaId,
        external_id: externalId,
        title: listing.title || null,
        price: listing.price ?? null,
        location: listing.location || structuredLocation || null,
        url: listing.url || null,
        area: listing.area ?? null,
        rooms: listing.rooms ?? null,
        city: listing.city || null,
        concelho: listing.concelho ?? null,
        freguesia: listing.freguesia ?? null,
        district: listing.district || null,
        owner_name: listing.ownerName || null,
        is_private_owner: listing.isPrivateOwner === null || listing.isPrivateOwner === undefined
          ? null
          : Boolean(listing.isPrivateOwner),
        created_at_first: toIsoOrNull(listing.createdAtFirst),
        published_at: toPublishedAtIsoOrNull(listing.publishedAt, referenceDate),
        modified_at: toIsoOrNull(listing.modifiedAt),
        short_description: listing.shortDescription || null,
        source: listing.source || null,
        status: "new",
        detected_at: toIsoOrNull(fetchedAt) || (detectedAtFallbackNow ? new Date().toISOString() : null),
        provider_active: true,
        last_seen_at: syncStartedAtIso,
        raw_data: listing
      };
      if (score !== undefined) payload.score = score;

      const { data: inserted, error: insertError } = await supabaseClient
        .from("provider_leads")
        .insert([payload])
        .select("id")
        .single();

      return { externalId, inserted, insertError };
    });

    const insertResults = await runConcurrent(insertTasks, CONCURRENCY_LIMIT);

    for (const { externalId, inserted, insertError } of insertResults) {
      if (insertError) {
        errors.push({ externalId, error: insertError.message });
      } else if (inserted) {
        created += 1;
        junctionRows.push({ empresa_id: scopedEmpresaId, provider_lead_id: inserted.id, first_seen_at: syncStartedAtIso, created_at: junctionNow, updated_at: junctionNow });
      }
    }
  }

  // Single batch upsert for empresa_provider_listings — replaces per-listing individual upserts.
  if (junctionRows.length > 0) {
    const { error: junctionError } = await supabaseClient
      .from("empresa_provider_listings")
      .upsert(junctionRows, { onConflict: "empresa_id,provider_lead_id", ignoreDuplicates: true });
    if (junctionError) errors.push({ externalId: "*", error: junctionError.message });
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
