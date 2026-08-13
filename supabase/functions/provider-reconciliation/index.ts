import { createClient } from "npm:@supabase/supabase-js";
import {
  fetchImovirtualSearchPage,
  extractNextData,
  extractListings
} from "../../../src/shared/provider-engine/index.js";
import { ProviderSearchBuilder } from "../../../src/providers/search/ProviderSearchBuilder.js";
import "../../../src/providers/search/ImovirtualSearchBuilder.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const PAGES_PER_EXECUTION = 3; // conservative limit per invocation
const INDIVIDUAL_FETCH_CONCURRENCY = 5;
const SKIP_URL_MARKER = "fromNoEstate"; // empreendimentos redirects to this pattern
// job stale if no checkpoint within this window
const STALE_JOB_MS = 5 * 60 * 1000;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

// Re-implements the private resolveLastPage from collectPaginatedListings.js
// (not exported from the engine index).
function resolveLastPage(nextData: unknown): number | null {
  const pagination = (nextData as Record<string, unknown>)
    ?.props?.pageProps?.data?.searchAds?.pagination as Record<string, unknown> | undefined;
  if (!pagination || typeof pagination !== "object") return null;
  for (const key of ["totalPages", "total_pages", "pageCount", "pages", "lastPage"]) {
    const n = Math.trunc(Number(pagination[key]));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

async function checkpointJob(
  client: ReturnType<typeof createClient>,
  jobId: string,
  urlIndex: number,
  currentPage: number,
  pagesProcessed: number
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await client
    .from("provider_reconciliation_jobs")
    .update({ current_url_index: urlIndex, current_page: currentPage, pages_processed: pagesProcessed, last_checkpoint_at: now, updated_at: now })
    .eq("id", jobId);
  if (error) console.error("[provider-reconciliation] checkpoint_failed", { jobId, error: error.message });
}

type ProviderListing = {
  externalId: string;
  title?: string | null;
  price?: number | null;
  area?: number | null;
  rooms?: number | null;
  city?: string | null;
  district?: string | null;
  ownerName?: string | null;
  url?: string | null;
  isPrivateOwner?: boolean;
  createdAtFirst?: string | null;
  shortDescription?: string | null;
  source?: string | null;
};

type AdStatus = "active" | "inactive" | "unknown";
type ValidatedListing = ProviderListing & { adStatus: AdStatus };

async function runConcurrentBatch<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const queue = items.map((item, i) => ({ item, i }));
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length > 0) {
      const entry = queue.shift()!;
      results[entry.i] = await fn(entry.item);
    }
  });
  await Promise.all(workers);
  return results;
}

// Fetches the listing page and reads pageProps.ad.status as source of truth.
async function fetchAdStatus(listingUrl: string): Promise<AdStatus> {
  try {
    const response = await globalThis.fetch(listingUrl);
    const html = await response.text();
    const nextData = extractNextData(html);
    const adStatus = (nextData as Record<string, unknown>)
      ?.props?.pageProps?.ad?.status;
    if (typeof adStatus !== "string") return "unknown";
    if (adStatus === "active") return "active";
    if (adStatus === "removed_by_user") return "inactive";
    return "unknown";
  } catch (_) {
    return "unknown";
  }
}

async function saveSeenListings(
  client: ReturnType<typeof createClient>,
  jobId: string,
  provider: string,
  listings: ValidatedListing[]
): Promise<void> {
  const externalIds = listings.map((l) => l.externalId).filter(Boolean);
  if (externalIds.length === 0) return;

  const { data: found, error: lookupError } = await client
    .from("provider_leads")
    .select("id, external_id")
    .eq("provider", provider)
    .in("external_id", externalIds);

  if (lookupError) {
    console.error("[provider-reconciliation] leads_lookup_failed", { error: lookupError.message });
    return;
  }

  const existingMap = new Map(
    ((found || []) as Array<{ id: string; external_id: string }>).map((r) => [r.external_id, r.id])
  );

  const now = new Date().toISOString();
  const seenRows: Array<{ reconciliation_job_id: string; provider_lead_id: string; external_id: string }> = [];

  for (const listing of listings) {
    const extId = listing.externalId;
    if (!extId) continue;

    const { adStatus } = listing;

    if (existingMap.has(extId)) {
      const leadId = existingMap.get(extId)!;

      if (adStatus === "active") {
        await client
          .from("provider_leads")
          .update({ price: listing.price ?? null, owner_name: listing.ownerName || null, short_description: listing.shortDescription || null, last_seen_at: now, updated_at: now, provider_active: true })
          .eq("provider", provider)
          .eq("external_id", extId);
        seenRows.push({ reconciliation_job_id: jobId, provider_lead_id: leadId, external_id: extId });
      } else if (adStatus === "inactive") {
        await client
          .from("provider_leads")
          .update({ provider_active: false, updated_at: now })
          .eq("provider", provider)
          .eq("external_id", extId);
      } else {
        // unknown — do not modify provider_active or any other fields on existing listings
        continue;
      }
    } else {
      if (adStatus !== "active") {
        console.log("[provider-reconciliation] skip_new_listing", { extId, adStatus });
        continue;
      }

      const { data: inserted, error: insertError } = await client
        .from("provider_leads")
        .insert({
          provider, external_id: extId,
          title: listing.title || null, price: listing.price ?? null,
          area: listing.area ?? null, rooms: listing.rooms ?? null,
          city: listing.city || null, district: listing.district || null,
          location: [listing.city, listing.district].filter(Boolean).join(", ") || null,
          owner_name: listing.ownerName || null, url: listing.url || null,
          is_private_owner: Boolean(listing.isPrivateOwner),
          created_at_first: listing.createdAtFirst || null,
          short_description: listing.shortDescription || null,
          source: listing.source || null,
          status: "new", provider_active: true,
          detected_at: now, last_seen_at: now
        })
        .select("id")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          // Race condition: another process inserted the same listing concurrently.
          const { data: race } = await client.from("provider_leads").select("id").eq("provider", provider).eq("external_id", extId).single();
          if (race) seenRows.push({ reconciliation_job_id: jobId, provider_lead_id: (race as { id: string }).id, external_id: extId });
        } else {
          console.error("[provider-reconciliation] lead_insert_failed", { extId, error: insertError.message });
        }
      } else if (inserted) {
        seenRows.push({ reconciliation_job_id: jobId, provider_lead_id: (inserted as { id: string }).id, external_id: extId });
      }
    }
  }

  if (seenRows.length === 0) return;

  const { error: upsertError } = await client
    .from("provider_reconciliation_seen_listings")
    .upsert(seenRows, { onConflict: "reconciliation_job_id,provider_lead_id", ignoreDuplicates: true });

  if (upsertError) {
    console.error("[provider-reconciliation] seen_upsert_failed", { error: upsertError.message });
  }
}

async function runPhase2(
  client: ReturnType<typeof createClient>,
  jobId: string,
  provider: string,
  pagesProcessed: number
): Promise<Response> {
  const { data: activeLeads, error: activeError } = await client
    .from("provider_leads")
    .select("id")
    .eq("provider", provider)
    .eq("provider_active", true);

  if (activeError) {
    console.error("[provider-reconciliation] phase2_active_fetch_failed", { error: activeError.message });
    return jsonResponse(200, { success: true, completed: true, phase2: false, phase2Error: activeError.message, jobId, pagesProcessed });
  }

  const { data: seenLeads, error: seenError } = await client
    .from("provider_reconciliation_seen_listings")
    .select("provider_lead_id")
    .eq("reconciliation_job_id", jobId);

  if (seenError) {
    console.error("[provider-reconciliation] phase2_seen_fetch_failed", { error: seenError.message });
    return jsonResponse(200, { success: true, completed: true, phase2: false, phase2Error: seenError.message, jobId, pagesProcessed });
  }

  const seenSet = new Set(
    ((seenLeads || []) as Array<{ provider_lead_id: string }>).map((r) => r.provider_lead_id)
  );

  // Safety guard: abort if no seen listings — prevents wiping entire catalog on bad state.
  if (seenSet.size === 0) {
    console.warn("[provider-reconciliation] phase2_aborted_no_seen", { jobId });
    return jsonResponse(200, { success: true, completed: true, phase2: false, phase2Error: "Nenhum seen listing registado \u2014 fase 2 abortada por seguran\u00e7a.", jobId, pagesProcessed });
  }

  const toExpireIds = ((activeLeads || []) as Array<{ id: string }>)
    .map((r) => r.id)
    .filter((id) => !seenSet.has(id));

  let expiredCount = 0;

  if (toExpireIds.length > 0) {
    const BATCH_SIZE = 500;
    for (let i = 0; i < toExpireIds.length; i += BATCH_SIZE) {
      const batch = toExpireIds.slice(i, i + BATCH_SIZE);
      const { error: expireError } = await client
        .from("provider_leads")
        .update({ provider_active: false })
        .in("id", batch);
      if (expireError) {
        console.error("[provider-reconciliation] phase2_expire_batch_failed", { batch: i / BATCH_SIZE, error: expireError.message });
      } else {
        expiredCount += batch.length;
      }
    }
  }

  console.log("[provider-reconciliation] phase2_completed", { jobId, activeTotal: (activeLeads || []).length, seenCount: seenSet.size, expiredCount });

  return jsonResponse(200, {
    success: true,
    completed: true,
    phase2: true,
    jobId,
    pagesProcessed,
    activeTotal: (activeLeads || []).length,
    seenCount: seenSet.size,
    expiredCount,
    message: `Reconcilia\u00e7\u00e3o global conclu\u00edda. ${expiredCount} listing(s) inativados.`
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse(405, { success: false, message: "Method Not Allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { success: false, message: "Variáveis de ambiente não configuradas." });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  let jobId: string | null = null;

  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const provider = String(body?.provider || "imovirtual").trim().toLowerCase();

    if (provider !== "imovirtual") {
      return jsonResponse(400, { success: false, message: `Provider '${provider}' não suportado.` });
    }

    // Direct Phase 2 execution on a previously completed job — skips Phase 1 entirely.
    const requestedJobId = typeof body?.jobId === "string" ? (body.jobId as string).trim() : null;
    if (requestedJobId) {
      const { data: completedJob, error: jobLookupError } = await supabaseAdmin
        .from("provider_reconciliation_jobs")
        .select("id, provider, status, pages_processed")
        .eq("id", requestedJobId)
        .single();

      if (jobLookupError || !completedJob) {
        return jsonResponse(404, { success: false, message: `Job '${requestedJobId}' n\u00e3o encontrado.` });
      }
      if ((completedJob as { provider: string }).provider !== provider) {
        return jsonResponse(400, { success: false, message: `Job '${requestedJobId}' pertence a provider diferente.` });
      }
      if ((completedJob as { status: string }).status !== "completed") {
        return jsonResponse(400, { success: false, message: `Job '${requestedJobId}' n\u00e3o est\u00e1 conclu\u00eddo (status: ${(completedJob as { status: string }).status}).` });
      }
      // Phase 2 (expiry) suspended — returns without altering provider_active.
      return jsonResponse(200, { success: true, completed: true, phase2: false, jobId: requestedJobId, pagesProcessed: (completedJob as { pages_processed: number }).pages_processed, message: "Fase 2 suspensa." });
    }

    const now = new Date().toISOString();

    // Acquire job — the UNIQUE partial index on (provider) WHERE status IN ('pending','running')
    // is the concurrency guard; no SELECT-then-INSERT pattern.
    const { data: newJob, error: insertError } = await supabaseAdmin
      .from("provider_reconciliation_jobs")
      .insert({ provider, status: "running", started_at: now, current_url_index: 0, current_page: 0, pages_processed: 0, last_checkpoint_at: now })
      .select("id, current_url_index, current_page, pages_processed")
      .single();

    let job: { id: string; current_url_index: number | null; current_page: number; pages_processed: number };

    if (insertError) {
      // code 23505 = unique_violation: an active job already exists for this provider
      if (insertError.code !== "23505") {
        return jsonResponse(500, { success: false, message: `Erro ao criar job: ${insertError.message}` });
      }

      const { data: existing, error: selectError } = await supabaseAdmin
        .from("provider_reconciliation_jobs")
        .select("id, current_url_index, current_page, pages_processed, last_checkpoint_at, status")
        .eq("provider", provider)
        .in("status", ["pending", "running"])
        .single();

      if (selectError || !existing) {
        return jsonResponse(500, { success: false, message: "Erro ao recuperar job existente." });
      }

      const existingStatus = (existing as { status: string }).status;
      if (existingStatus === "running") {
        const age = Date.now() - new Date((existing as { last_checkpoint_at: string }).last_checkpoint_at).getTime();
        const hasCheckpointProgress = (existing as { current_page?: number; pages_processed?: number }).pages_processed > 0 || (existing as { current_page?: number; pages_processed?: number }).current_page > 0;

        if (age < STALE_JOB_MS) {
          if (hasCheckpointProgress) {
            console.log("[provider-reconciliation] resuming_recent_running_job", {
              jobId: (existing as { id: string }).id,
              current_page: (existing as { current_page: number }).current_page,
              pages_processed: (existing as { pages_processed: number }).pages_processed,
              age
            });
          } else {
            // Another instance is actively processing this job without a valid checkpoint.
            return jsonResponse(200, { success: false, alreadyRunning: true, message: "Reconciliação já em curso para este provider." });
          }
        } else {
          // Stale running lock (no checkpoint for >5 min) — take over.
          console.log("[provider-reconciliation] resuming_stale_job", { jobId: (existing as { id: string }).id, current_page: (existing as { current_page: number }).current_page });
        }
      } else {
        // status = pending: previous batch finished normally, resume immediately.
        console.log("[provider-reconciliation] resuming_pending_job", { jobId: (existing as { id: string }).id, current_page: (existing as { current_page: number }).current_page });
      }

      job = existing as { id: string; current_url_index: number | null; current_page: number; pages_processed: number };
      jobId = job.id;
      // Re-lock to running so that if this invocation is killed, the stale check applies.
      await supabaseAdmin.from("provider_reconciliation_jobs").update({ status: "running", last_checkpoint_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", jobId);
    } else {
      job = newJob as { id: string; current_url_index: number | null; current_page: number; pages_processed: number };
      jobId = job.id;
      console.log("[provider-reconciliation] new_job_created", { jobId, provider });
    }

    // Build global search URLs: all categories, no district, all owner types.
    const searchUrls: string[] = ProviderSearchBuilder.build(provider, {
      districts: [],
      includePrivateOwners: true,
      includeProfessionalOwners: true
    });

    let urlIndex = job.current_url_index ?? 0;
    let nextPage = (job.current_page ?? 0) + 1;

    let pagesThisExecution = 0;
    let pagesProcessedTotal = job.pages_processed;
    let stopped = false;

    console.log("[provider-reconciliation] execution_start", {
      jobId,
      urlIndex,
      nextPage,
      urlsTotal: searchUrls.length,
      pagesAlreadyProcessed: pagesProcessedTotal
    });

    outer: for (; urlIndex < searchUrls.length; urlIndex++) {
      const searchUrl = searchUrls[urlIndex];

      for (let page = nextPage; ; page++) {
        if (pagesThisExecution >= PAGES_PER_EXECUTION) {
          stopped = true;
          break outer;
        }

        console.log("[provider-reconciliation] fetch_page", { urlIndex, page, searchUrl });

        const pageResult = await fetchImovirtualSearchPage({
          searchUrl,
          page,
          fetchImpl: globalThis.fetch
        });

        // Skip categories that redirect (e.g. empreendimentos → fromNoEstate)
        if (pageResult.finalUrl?.includes(SKIP_URL_MARKER)) {
          console.log("[provider-reconciliation] url_skipped_redirect", { urlIndex, finalUrl: pageResult.finalUrl });
          await checkpointJob(supabaseAdmin, jobId, urlIndex + 1, 0, pagesProcessedTotal);
          nextPage = 1;
          break;
        }

        const nextData = extractNextData(pageResult.html);
        const listings = extractListings(nextData);

        pagesThisExecution++;
        pagesProcessedTotal++;

        if (listings.length === 0) {
          console.log("[provider-reconciliation] url_exhausted", { urlIndex, page });
          await checkpointJob(supabaseAdmin, jobId, urlIndex + 1, 0, pagesProcessedTotal);
          nextPage = 1;
          break; // advance outer loop to next URL
        }

        // Validate each listing's individual page status with limited concurrency
        const pageExternalIds = (listings as ProviderListing[])
          .map((listing) => String(listing?.externalId || "").trim())
          .filter((externalId) => externalId.length > 0);

        const existingByExternalId = new Map<string, boolean>();
        if (pageExternalIds.length > 0) {
          const { data: existingRows, error: existingLookupError } = await supabaseAdmin
            .from("provider_leads")
            .select("external_id, provider_active")
            .eq("provider", provider)
            .in("external_id", pageExternalIds);

          if (!existingLookupError) {
            for (const row of (existingRows || []) as Array<{ external_id: string; provider_active: boolean }>) {
              existingByExternalId.set(row.external_id, Boolean(row.provider_active));
            }
          }
        }

        const listingsNeedingValidation = (listings as ProviderListing[]).filter((listing) => {
          const externalId = String(listing?.externalId || "").trim();
          if (!externalId) return true;
          const knownActive = existingByExternalId.get(externalId);
          return knownActive !== true;
        });

        const validatedListings = await runConcurrentBatch<ProviderListing, ValidatedListing>(
          listingsNeedingValidation,
          INDIVIDUAL_FETCH_CONCURRENCY,
          async (listing): Promise<ValidatedListing> => {
            const externalId = String(listing?.externalId || "").trim();
            const knownActive = externalId ? existingByExternalId.get(externalId) : undefined;
            if (knownActive === true) {
              return { ...listing, adStatus: "active" };
            }
            return {
              ...listing,
              adStatus: listing.url ? await fetchAdStatus(listing.url) : "unknown"
            };
          }
        );

        const validatedMap = new Map<string, ValidatedListing>();
        for (const listing of validatedListings) {
          const externalId = String(listing?.externalId || "").trim();
          if (externalId) validatedMap.set(externalId, listing);
        }

        const finalValidatedListings: ValidatedListing[] = (listings as ProviderListing[]).map((listing) => {
          const externalId = String(listing?.externalId || "").trim();
          if (!externalId) return { ...listing, adStatus: "unknown" };
          const existingActive = existingByExternalId.get(externalId);
          if (existingActive === true) return { ...listing, adStatus: "active" };
          return validatedMap.get(externalId) ?? { ...listing, adStatus: "unknown" };
        });

        await saveSeenListings(supabaseAdmin, jobId, provider, finalValidatedListings);
        await checkpointJob(supabaseAdmin, jobId, urlIndex, page, pagesProcessedTotal);

        const lastPage = resolveLastPage(nextData);
        if (lastPage && page >= lastPage) {
          console.log("[provider-reconciliation] url_last_page", { urlIndex, page, lastPage });
          await checkpointJob(supabaseAdmin, jobId, urlIndex + 1, 0, pagesProcessedTotal);
          nextPage = 1;
          break;
        }
      }

      nextPage = 1; // reset for the next URL after inner loop exits normally
    }

    const finishedAt = new Date().toISOString();

    if (!stopped && urlIndex >= searchUrls.length) {
      // Phase 1 complete — mark job completed before running Phase 2.
      await supabaseAdmin
        .from("provider_reconciliation_jobs")
        .update({ status: "completed", completed_at: finishedAt, updated_at: finishedAt })
        .eq("id", jobId);

      console.log("[provider-reconciliation] phase1_completed", { jobId, pagesProcessed: pagesProcessedTotal });

      // Phase 2 (expiry) suspended — returns without altering provider_active.
      return jsonResponse(200, { success: true, completed: true, phase2: false, jobId, pagesProcessed: pagesProcessedTotal, message: "Reconcilia\u00e7\u00e3o global conclu\u00edda. Fase 2 suspensa." });
    }

    // Batch done — set status to pending so the next invocation can resume immediately.
    await supabaseAdmin.from("provider_reconciliation_jobs").update({ status: "pending", updated_at: finishedAt }).eq("id", jobId);
    console.log("[provider-reconciliation] partial", { jobId, pagesThisExecution, pagesProcessedTotal, urlIndex, nextPage });

    return jsonResponse(200, {
      success: true,
      completed: false,
      jobId,
      pagesThisExecution,
      pagesProcessed: pagesProcessedTotal,
      message: "Execução parcial concluída. Próxima invocação retomará a partir do checkpoint."
    });

  } catch (error) {
    console.error("[provider-reconciliation] unhandled", error);

    if (jobId) {
      const errMsg = (error instanceof Error ? error.message : String(error)).slice(0, 500);
      try {
        await supabaseAdmin
          .from("provider_reconciliation_jobs")
          .update({ status: "failed", error_message: errMsg, updated_at: new Date().toISOString() })
          .eq("id", jobId);
      } catch (_) {
        // secondary error ignored — primary error is already being returned
      }
    }

    return jsonResponse(500, {
      success: false,
      message: error instanceof Error ? error.message : "Erro desconhecido."
    });
  }
});
