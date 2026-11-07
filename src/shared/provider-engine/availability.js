import { extractNextData } from "./imovirtual/parsers.js";

export const AVAILABILITY_STATUS = Object.freeze({
  AVAILABLE: "available",
  UNAVAILABLE: "unavailable",
  INCONCLUSIVE: "inconclusive"
});

export const IMOVIRTUAL_ALLOWED_HOSTS = Object.freeze(["www.imovirtual.com"]);
export const CUSTOJUSTO_ALLOWED_HOSTS = Object.freeze(["www.custojusto.pt", "custojusto.pt"]);
export const OLX_ALLOWED_HOSTS = Object.freeze(["www.olx.pt"]);
export const MAX_AVAILABILITY_ERRORS = 50;

function normalizeExternalId(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function inconclusive(reason) {
  return {
    status: AVAILABILITY_STATUS.INCONCLUSIVE,
    reason
  };
}

function unavailable(reason) {
  return {
    status: AVAILABILITY_STATUS.UNAVAILABLE,
    reason
  };
}

function available(reason) {
  return {
    status: AVAILABILITY_STATUS.AVAILABLE,
    reason
  };
}

function getProviderHost(provider) {
  const hosts = {
    imovirtual: IMOVIRTUAL_ALLOWED_HOSTS,
    custojusto: CUSTOJUSTO_ALLOWED_HOSTS,
    olx: OLX_ALLOWED_HOSTS
  };

  return hosts[String(provider || "").trim().toLowerCase()] || [];
}

function extractListingIdentity(provider, parsedUrl) {
  const pathname = parsedUrl.pathname;
  const normalizedProvider = String(provider || "").trim().toLowerCase();

  if (normalizedProvider === "imovirtual") {
        const match = pathname.match(/-((?:ID)[a-z0-9]+)\/?$/i);
    if (match) return match[1].toUpperCase();

    const fallback = pathname.match(/\/(\d+)\/?$/);
    return fallback?.[1] || null;
    return match?.[1]?.toUpperCase() || null;
  }

  if (normalizedProvider === "olx") {
    const match = pathname.match(/-((?:ID)[a-z0-9]+)\.html$/i);
    return match?.[1]?.toUpperCase() || null;
  }

  if (normalizedProvider === "custojusto") {
    const goneId = parsedUrl.searchParams.get("gone");

    if (goneId && /^\d+$/.test(goneId)) {
      return goneId;
    }

    const match = pathname.match(/-(\d+)\/?$/);
    return match?.[1] || null;
  }

  return null;
}

export function validateProviderListingUrl(provider, value) {
  const normalizedProvider = String(provider || "").trim().toLowerCase();

  try {
    const parsed = new URL(String(value || ""));

    if (parsed.protocol !== "https:") {
      return { valid: false, reason: "url_protocol_not_allowed" };
    }

    if (!getProviderHost(normalizedProvider).includes(parsed.hostname.toLowerCase())) {
      return { valid: false, reason: "url_host_not_allowed" };
    }

    if (parsed.username || parsed.password) {
      return { valid: false, reason: "url_credentials_not_allowed" };
    }

    if (normalizedProvider === "imovirtual") {
      if (!/^\/(?:hpr\/)?pt\/(?:anuncio|ad)\//i.test(parsed.pathname)) {
        return { valid: false, reason: "url_path_not_allowed" };
      }
    } else if (normalizedProvider === "olx") {
      if (!/^\/d\/anuncio\/.+-ID[a-z0-9]+\.html$/i.test(parsed.pathname)) {
        return { valid: false, reason: "url_path_not_allowed" };
      }
    } else if (normalizedProvider === "custojusto") {
      if (!/^\/[^/]+\/imobiliario\/.+/i.test(parsed.pathname)) {
        return { valid: false, reason: "url_path_not_allowed" };
      }
    } else {
      return { valid: false, reason: "provider_url_not_supported" };
    }

    const listingIdentity = extractListingIdentity(normalizedProvider, parsed);

    if (!listingIdentity) {
      return { valid: false, reason: "listing_identity_not_found_in_url" };
    }

    return {
      valid: true,
      url: parsed,
      listingIdentity
    };
  } catch {
    return { valid: false, reason: "url_invalid" };
  }
}

export function classifyImovirtualAvailability(html, expectedExternalId = null) {
  const nextData = extractNextData(html);
  const ad = nextData?.props?.pageProps?.ad;

  const returnedExternalId = normalizeExternalId(ad?.id);
  const expectedId = normalizeExternalId(expectedExternalId);

  if (!returnedExternalId || !expectedId) {
    return inconclusive("ad_identity_unavailable");
  }

  if (returnedExternalId !== expectedId) {
    return inconclusive("ad_identity_mismatch");
  }

  const status = String(ad?.status || "").trim().toLowerCase();

  if (status === "active") {
    return available("ad_status_active");
  }

  if (status === "removed_by_user") {
    return unavailable("ad_status_removed_by_user");
  }

  return inconclusive("missing_or_unknown_ad_status");
}

function extractVisibleText(html) {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function classifyCustoJustoAvailability(html, expectedExternalId, listingIdentity) {
  const expectedId = normalizeExternalId(expectedExternalId);

  if (!expectedId || expectedId !== listingIdentity) {
    return inconclusive("ad_identity_mismatch");
  }

  const text = extractVisibleText(html);

  const unavailablePatterns = [
    /o anúncio que procura já não está activo/,
    /o anúncio que procura já não está ativo/,
    /este anúncio já não está activo/,
    /este anúncio já não está ativo/,
    /anúncio removido/,
    /anúncio expirado/,
    /anúncio indisponível/
  ];

  if (unavailablePatterns.some((pattern) => pattern.test(text))) {
    return unavailable("custojusto_explicit_unavailable_message");
  }

  return inconclusive("custojusto_status_not_confirmed");
}

function classifyOlxAvailability(html, expectedExternalId, listingIdentity) {
  const expectedId = normalizeExternalId(expectedExternalId);

  if (!expectedId || expectedId.toUpperCase() !== listingIdentity) {
    return inconclusive("ad_identity_mismatch");
  }

  const text = extractVisibleText(html);

  const unavailablePatterns = [
    /este anúncio já não está disponível/,
    /este anúncio não está disponível/,
    /anúncio removido/,
    /anúncio eliminado/,
    /anúncio expirado/,
    /este anúncio foi removido/,
    /o anúncio foi removido/,
    /não foi possível encontrar este anúncio/
  ];

  if (unavailablePatterns.some((pattern) => pattern.test(text))) {
    return unavailable("olx_explicit_unavailable_message");
  }

  return inconclusive("olx_status_not_confirmed");
}

function validateResponseListingIdentity(provider, validatedUrl, responseUrl) {
  if (!responseUrl) {
    return { valid: false, reason: "response_url_unavailable" };
  }

  let responseValidation;

  try {
    responseValidation = validateProviderListingUrl(provider, responseUrl);
  } catch {
    return { valid: false, reason: "invalid_response_url" };
  }

  if (!responseValidation.valid) {
    return { valid: false, reason: "invalid_response_url" };
  }

  if (
    responseValidation.url.origin !== validatedUrl.url.origin ||
    responseValidation.url.pathname !== validatedUrl.url.pathname ||
    responseValidation.listingIdentity !== validatedUrl.listingIdentity
  ) {
    return { valid: false, reason: "unexpected_response_url" };
  }

  return { valid: true };
}

function classifyHttpGone(provider, validatedUrl, responseUrl) {
  const responseValidation = validateResponseListingIdentity(
    provider,
    validatedUrl,
    responseUrl
  );

  if (!responseValidation.valid) {
    return inconclusive(responseValidation.reason);
  }

  if (!validatedUrl.listingIdentity) {
    return inconclusive("gone_without_listing_identity");
  }

  return unavailable(`${provider}_http_410_confirmed_listing_url`);
}

function classifyProviderHtml(provider, html, externalId, listingIdentity) {
  if (provider === "imovirtual") {
    return classifyImovirtualAvailability(html, externalId);
  }

  if (provider === "custojusto") {
    return classifyCustoJustoAvailability(html, externalId, listingIdentity);
  }

  if (provider === "olx") {
    return classifyOlxAvailability(html, externalId, listingIdentity);
  }

  return inconclusive("provider_status_not_supported");
}

/**
 * Verifica a disponibilidade de um anúncio nos providers suportados.
 *
 * Uma resposta só é considerada indisponível perante:
 * - HTTP 410 no URL original validado;
 * - Estado estruturado removed_by_user no Imovirtual;
 * - Mensagem explícita de indisponibilidade nos restantes portais.
 *
 * HTTP 404, redirects, timeout, erros de rede e estados desconhecidos
 * permanecem inconclusivos.
 */
export async function checkProviderListingAvailability({
  provider,
  externalId,
  url,
  fetchImpl = globalThis.fetch,
  timeoutMs = 15000
} = {}) {
  const normalizedProvider = String(provider || "").trim().toLowerCase();

  if (!["imovirtual", "custojusto", "olx"].includes(normalizedProvider)) {
    return inconclusive("provider_status_not_supported");
  }

  const validatedUrl = validateProviderListingUrl(normalizedProvider, url);

  if (!validatedUrl.valid) {
    return inconclusive(validatedUrl.reason);
  }

  if (!externalId || typeof fetchImpl !== "function") {
    return inconclusive("missing_external_id_or_fetch");
  }

  const normalizedExternalId = normalizeExternalId(externalId);

  if (normalizedProvider !== "imovirtual") {
    const expectedIdentity = normalizedProvider === "olx"
      ? normalizedExternalId.toUpperCase()
      : normalizedExternalId;

    if (expectedIdentity !== validatedUrl.listingIdentity) {
      return inconclusive("ad_identity_mismatch");
    }
  }

  const controller = typeof AbortController === "function"
    ? new AbortController()
    : null;

  const timeout = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const requestOptions = { redirect: "manual" };

    if (controller) {
      requestOptions.signal = controller.signal;
    }

    const response = await fetchImpl(
      validatedUrl.url.toString(),
      requestOptions
    );

    if (response?.status >= 300 && response?.status < 400) {
      return inconclusive("unexpected_redirect");
    }

    if (response?.status === 410) {
      return classifyHttpGone(
        normalizedProvider,
        validatedUrl,
        response?.url
      );
    }

    if (response?.status === 404) {
      return inconclusive("http_error");
    }

    if (!response?.ok) {
      return inconclusive("http_error");
    }

    const responseValidation = validateResponseListingIdentity(
      normalizedProvider,
      validatedUrl,
      response?.url
    );

    if (!responseValidation.valid) {
      return inconclusive(responseValidation.reason);
    }

    const html = await response.text();

    return classifyProviderHtml(
      normalizedProvider,
      html,
      normalizedExternalId,
      validatedUrl.listingIdentity
    );
  } catch (error) {
    return inconclusive(
      error?.name === "AbortError" ? "timeout" : "request_error"
    );
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
/**
 * Processa anúncios com controlo de concorrência e interrupção por perda de lease.
 *
 * @param {Array<Record<string, any>>} leads
 * @param {{
 *   checkAvailability?: (lead: Record<string, any>) => Promise<{status: string, reason?: string}>,
 *   inactivateLead?: (lead: Record<string, any>) => Promise<boolean>,
 *   onResult?: (result: any, counts: Record<string, number>) => Promise<void> | void,
 *   concurrency?: number
 * }} options
 */
export async function processProviderAvailabilityLeads(
  leads,
  {
    checkAvailability = checkProviderListingAvailability,
    inactivateLead,
    onResult = null,
    concurrency = 5
  } = {}
) {
  const sourceLeads = Array.isArray(leads) ? leads : [];
  const counts = {
    checked: 0,
    available: 0,
    inactivated: 0,
    inconclusive: 0,
    errors: 0
  };
  const errors = [];
  let omittedErrors = 0;
  const recordError = (detail) => {
    if (errors.length < MAX_AVAILABILITY_ERRORS) errors.push(detail);
    else omittedErrors += 1;
  };
  const queue = sourceLeads.map((lead, index) => ({ lead, index }));
  const results = new Array(queue.length);

  let fatalError = null;

  function isLeaseLost(error) {
    return error?.code === "availability_run_lease_lost"
      || String(error?.message || error).includes("availability_run_lease_lost");
  }

  async function processOne(lead) {
    if (lead?.provider_active !== true) {
      return { state: "skipped", leadId: lead?.id || null };
    }

    counts.checked += 1;

    try {
      const availability = await checkAvailability(lead);

      if (fatalError) throw fatalError;

      if (availability?.status === AVAILABILITY_STATUS.AVAILABLE) {
        counts.available += 1;
        return { state: "available", leadId: lead.id, reason: availability.reason };
      }

      if (availability?.status === AVAILABILITY_STATUS.UNAVAILABLE) {
        if (fatalError) throw fatalError;

        const updated = typeof inactivateLead === "function" ? await inactivateLead(lead) : false;

        if (fatalError) throw fatalError;

        if (!updated) {
          counts.errors += 1;
          const detail = { provider: lead.provider, external_id: lead.external_id, code: "inactivation_not_applied" };
          recordError(detail);
          return { state: "error", leadId: lead.id, ...detail };
        }

        counts.inactivated += 1;
        return { state: "inactivated", leadId: lead.id, reason: availability.reason };
      }

      counts.inconclusive += 1;
      return { state: "inconclusive", leadId: lead.id, reason: availability?.reason || "unknown" };
    } catch (error) {
      if (isLeaseLost(error)) {
        fatalError = fatalError || error;
        throw fatalError;
      }

      if (fatalError) throw fatalError;

      counts.errors += 1;
      const detail = {
        provider: lead.provider,
        external_id: lead.external_id,
        code: "listing_check_failed",
        message: String(error?.message || "listing_check_failed").slice(0, 240)
      };
      recordError(detail);
      return { state: "error", leadId: lead.id, ...detail };
    }
  }

  const workerCount = Math.min(Math.max(Number(concurrency) || 1, 1), Math.max(queue.length, 1));
  const workerResults = await Promise.allSettled(Array.from({ length: workerCount }, async () => {
    while (queue.length > 0 && !fatalError) {
      const entry = queue.shift();
      if (!entry) return;

      const result = await processOne(entry.lead);
      results[entry.index] = result;

      if (typeof onResult === "function") {
        await onResult(result, { ...counts });
      }
    }
  }));

  if (fatalError) throw fatalError;

  const rejectedWorker = workerResults.find((result) => result.status === "rejected");
  if (rejectedWorker) throw rejectedWorker.reason;

  return { counts, errors, omittedErrors, results };
}


