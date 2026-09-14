function wait(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function average(values) {
  const numeric = values.filter((value) => Number.isFinite(value));
  return numeric.length ? Number((numeric.reduce((total, value) => total + value, 0) / numeric.length).toFixed(2)) : 0;
}

async function runOlxCategoryAcquisition(definitions, { worker, parseSearchPage, delayBetweenRequestsMs = 1500 } = {}) {
  if (!Array.isArray(definitions)) throw new TypeError("As Search Definitions devem ser um array.");
  if (!worker || typeof worker.acquire !== "function") throw new TypeError("O harness requer um worker de aquisição válido.");
  if (typeof parseSearchPage !== "function") throw new TypeError("O harness requer um parser de pesquisas válido.");

  const results = [];
  for (const definition of definitions) {
    if (results.length > 0) await wait(delayBetweenRequestsMs);

    const searchUrl = definition?.searchUrl || null;
    if (!searchUrl) {
      results.push({ categoryName: definition?.categoryName || null, searchUrl, httpStatus: null, durationMs: 0, bytes: 0, listingsFound: 0, nextUrl: null, externalIds: [], error: "Search Definition sem searchUrl." });
      continue;
    }

    try {
      const acquisition = await worker.acquire(searchUrl, { maxRetries: 0 });
      if (acquisition.errorType) {
        results.push({ categoryName: definition.categoryName || null, searchUrl, httpStatus: acquisition.status || null, durationMs: acquisition.durationMs || 0, bytes: acquisition.bytes || 0, listingsFound: 0, nextUrl: null, externalIds: [], error: acquisition.errorMessage || acquisition.errorType });
        continue;
      }

      const parsed = parseSearchPage(acquisition.body);
      const listings = Array.isArray(parsed?.listings) ? parsed.listings : [];
      results.push({
        categoryName: definition.categoryName || null,
        searchUrl,
        httpStatus: acquisition.status || null,
        durationMs: acquisition.durationMs || 0,
        bytes: acquisition.bytes || 0,
        listingsFound: listings.length,
        nextUrl: parsed?.nextUrl || null,
        externalIds: listings.map((listing) => listing.externalId).filter(Boolean),
        externalListingsIgnored: parsed?.metrics?.externalLinksIgnored || 0,
        error: null
      });
    } catch (error) {
      results.push({ categoryName: definition.categoryName || null, searchUrl, httpStatus: null, durationMs: 0, bytes: 0, listingsFound: 0, nextUrl: null, externalIds: [], error: error.message });
    }
  }

  const uniqueExternalIds = new Set(results.flatMap((result) => result.externalIds));
  const successful = results.filter((result) => !result.error);
  return {
    results,
    metrics: {
      searchesAttempted: results.length,
      searchesSucceeded: successful.length,
      searchesFailed: results.length - successful.length,
      totalListings: results.reduce((total, result) => total + result.listingsFound, 0),
      uniqueExternalIds: uniqueExternalIds.size,
      totalRequests: results.filter((result) => result.searchUrl).length,
      totalBytes: results.reduce((total, result) => total + result.bytes, 0),
      averageDurationMs: average(results.map((result) => result.durationMs)),
      averageListingsPerSearch: average(results.map((result) => result.listingsFound)),
      externalListingsIgnored: results.reduce((total, result) => total + (result.externalListingsIgnored || 0), 0)
    }
  };
}

module.exports = { runOlxCategoryAcquisition };