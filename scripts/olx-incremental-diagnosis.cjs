const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const babel = require("@babel/core");
const { CurlTransport, AcquisitionWorker } = require("../server/services/acquisition/index.cjs");

const MONTHS = {
  janeiro: 0, fevereiro: 1, marco: 2, março: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
};

function loadModule(relativePath, dependencies = {}) {
  const modulePath = path.resolve(__dirname, relativePath);
  const source = fs.readFileSync(modulePath, "utf8");
  const { code } = babel.transformSync(source, { filename: modulePath, presets: [["@babel/preset-env", { modules: "commonjs" }]] });
  const module = { exports: {} };
  const resolve = (request) => dependencies[request] || require(request);
  new Function("exports", "module", "require", code)(module.exports, module, resolve);
  return module.exports;
}

function parsePublishedAt(value, referenceDate) {
  if (!value) return null;
  const raw = String(value).trim();
  const normalized = raw.toLowerCase().replace(/^para o topo\s+/u, "");
  const explicit = normalized.match(/(\d{1,2}) de ([a-zç]+) de (\d{4})(?:\s+às?\s+(\d{1,2}):(\d{2}))?/u);
  if (explicit && MONTHS[explicit[2]] !== undefined) {
    return {
      raw,
      timestamp: Date.UTC(Number(explicit[3]), MONTHS[explicit[2]], Number(explicit[1]), Number(explicit[4] || 0), Number(explicit[5] || 0)),
      kind: "explicit_date"
    };
  }

  const relative = normalized.match(/^(hoje|ontem)(?:\s+às?\s+(\d{1,2}):(\d{2}))?/u);
  if (relative) {
    const date = new Date(referenceDate);
    if (relative[1] === "ontem") date.setUTCDate(date.getUTCDate() - 1);
    return {
      raw,
      timestamp: Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), Number(relative[2] || 0), Number(relative[3] || 0)),
      kind: "relative_day"
    };
  }

  return { raw, timestamp: null, kind: "unparseable" };
}

function formatTimestamp(timestamp) {
  return timestamp === null ? null : new Date(timestamp).toISOString();
}

function listingTimes(listings, referenceDate) {
  return listings.map((listing) => ({ listing, parsed: parsePublishedAt(listing.publishedAt, referenceDate) }));
}

function pageTemporalSummary(listings, referenceDate) {
  const values = listingTimes(listings, referenceDate);
  const comparable = values.filter(({ parsed }) => parsed?.timestamp !== null);
  const violations = [];
  for (let index = 1; index < comparable.length; index += 1) {
    if (comparable[index - 1].parsed.timestamp < comparable[index].parsed.timestamp) {
      violations.push({ before: comparable[index - 1].listing, after: comparable[index].listing });
    }
  }
  const timestamps = comparable.map(({ parsed }) => parsed.timestamp);
  const newest = timestamps.length ? Math.max(...timestamps) : null;
  const oldest = timestamps.length ? Math.min(...timestamps) : null;
  return {
    listings: listings.length,
    publishedAtPresent: listings.filter((listing) => listing.publishedAt).length,
    publishedAtMissing: listings.filter((listing) => !listing.publishedAt).length,
    invalidPublishedAt: values.filter(({ parsed }) => parsed?.kind === "unparseable").length,
    uniquePublishedAt: new Set(listings.map((listing) => listing.publishedAt).filter(Boolean)).size,
    newestPublishedAt: comparable.find(({ parsed }) => parsed.timestamp === newest)?.listing.publishedAt || null,
    oldestPublishedAt: comparable.find(({ parsed }) => parsed.timestamp === oldest)?.listing.publishedAt || null,
    newestTimestamp: formatTimestamp(newest),
    oldestTimestamp: formatTimestamp(oldest),
    comparableValues: comparable.length,
    orderingViolations: violations.length,
    orderingViolationSamples: violations.slice(0, 2).map(({ before, after }) => ({ before: { externalId: before.externalId, publishedAt: before.publishedAt }, after: { externalId: after.externalId, publishedAt: after.publishedAt } }))
  };
}

function classifyOrdering(listings, referenceDate) {
  const values = listingTimes(listings, referenceDate);
  const comparable = values.filter(({ parsed }) => parsed?.timestamp !== null);
  if (comparable.length < 2 || comparable.length !== values.length) return "UNKNOWN";
  for (let index = 1; index < comparable.length; index += 1) {
    if (comparable[index - 1].parsed.timestamp < comparable[index].parsed.timestamp) return "NON_MONOTONIC";
  }
  return "MONOTONIC";
}

function overlap(left, right) {
  const rightIds = new Set(right.map((listing) => listing.externalId));
  return left.filter((listing) => rightIds.has(listing.externalId));
}

function analyzeNextUrls(pages) {
  const transitions = pages.map((page) => ({ currentUrl: page.requestedUrl, nextUrl: page.parsed.nextUrl || null }));
  const parsedTransitions = transitions.filter((transition) => transition.nextUrl).map((transition) => ({ ...transition, current: new URL(transition.currentUrl), next: new URL(transition.nextUrl) }));
  const sameCategory = parsedTransitions.every(({ current, next }) => current.hostname === next.hostname && current.pathname === next.pathname);
  const pageNumbers = parsedTransitions.map(({ next }) => Number(next.searchParams.get("page")));
  const numericPageProgression = pageNumbers.length > 0 && pageNumbers.every((pageNumber, index) => Number.isInteger(pageNumber) && pageNumber === index + 2);
  const visited = new Set();
  const repeated = transitions.some(({ nextUrl }) => nextUrl && (visited.has(nextUrl) || (visited.add(nextUrl) && false)));
  return {
    transitions: transitions.map(({ currentUrl, nextUrl }) => ({ currentUrl, nextUrl })),
    sameCategoryPath: sameCategory,
    pageParameterValues: pageNumbers,
    pageParameterProgression: numericPageProgression,
    repeatedNextUrl: repeated,
    mechanism: numericPageProgression && sameCategory ? "page_number_observed" : "unknown_or_opaque",
    stability: sameCategory && numericPageProgression && !repeated ? "stable_in_observed_sample" : "not_proven_stable"
  };
}

function analyzeCheckpoints(pageListings, pageSummaries, referenceDate) {
  const firstPage = pageListings[0] || [];
  const checkpointListing = firstPage[firstPage.length - 1] || null;
  const laterListings = pageListings.slice(1).flat();
  const laterCheckpointIndex = laterListings.findIndex((listing) => listing.externalId === checkpointListing?.externalId);
  const firstPageIds = new Set(firstPage.map((listing) => listing.externalId));
  const firstKnownAfterPageOne = pageListings.slice(1).map((listings, index) => {
    const firstKnownIndex = listings.findIndex((listing) => firstPageIds.has(listing.externalId));
    return { pageNumber: index + 2, firstKnownIndex, listingsAfterFirstKnown: firstKnownIndex < 0 ? null : listings.length - firstKnownIndex - 1 };
  });
  const firstPageOldest = pageSummaries[0]?.oldestTimestamp ? Date.parse(pageSummaries[0].oldestTimestamp) : null;
  const listingsAtOrAfterFirstPageWatermark = laterListings.filter((listing) => {
    const parsed = parsePublishedAt(listing.publishedAt, referenceDate);
    return firstPageOldest !== null && parsed?.timestamp !== null && parsed.timestamp >= firstPageOldest;
  }).length;
  return {
    simulatedExternalIdCheckpoint: checkpointListing?.externalId || null,
    checkpointFoundOnLaterPages: laterCheckpointIndex >= 0,
    checkpointPositionAfterPageOne: laterCheckpointIndex >= 0 ? laterCheckpointIndex + 1 : null,
    firstPageKnownIdsStopSimulation: firstKnownAfterPageOne,
    simulatedPublishedAtWatermark: pageSummaries[0]?.oldestPublishedAt || null,
    laterListingsAtOrAfterPublishedAtWatermark: listingsAtOrAfterFirstPageWatermark,
    assessment: {
      externalIdCheckpoint: laterCheckpointIndex >= 0 ? "CONDITIONAL" : "UNKNOWN",
      publishedAtCheckpoint: listingsAtOrAfterFirstPageWatermark > 0 ? "UNSAFE" : "UNKNOWN",
      pageCheckpoint: "UNSAFE"
    }
  };
}

async function main() {
  global.DOMParser = new JSDOM("<!doctype html><html><body></body></html>").window.DOMParser;
  const categoryDiscovery = loadModule("../src/shared/provider-engine/olx/categoryDiscovery.js");
  const { buildOlxSearchDefinitions } = loadModule("../src/shared/provider-engine/olx/searchDefinitions.js", { "./categoryDiscovery": categoryDiscovery });
  const { parseOlxSearchPage } = loadModule("../src/shared/provider-engine/olx/parsers.js");
  const transport = new CurlTransport({ timeoutMs: 30000, connectTimeoutMs: 10000, maxRedirects: 5, maxResponseBytes: 5 * 1024 * 1024 });
  const worker = new AcquisitionWorker({ transport, maxRetries: 0, delayBetweenRequestsMs: 1500 });
  const referenceDate = new Date();
  const root = await worker.acquire("https://www.olx.pt/imoveis/", { maxRetries: 0 });
  if (root.errorType) throw new Error(root.errorMessage);
  const discovery = categoryDiscovery.discoverOlxCategories(root.body);
  const built = buildOlxSearchDefinitions(discovery.categories);
  const selected = built.definitions[0];
  const parsedPages = new Map();
  const run = await worker.run({
    url: selected.searchUrl,
    maxPages: 5,
    maxRequests: 5,
    maxRetries: 0,
    delayBetweenRequestsMs: 1500,
    nextUrlResolver: (page) => {
      const parsed = parseOlxSearchPage(page.body);
      parsedPages.set(page.requestedUrl, parsed);
      return parsed.nextUrl;
    }
  });
  const pages = run.pages.map((page) => ({ ...page, parsed: parsedPages.get(page.requestedUrl) || parseOlxSearchPage(page.body) }));
  const pageListings = pages.map((page) => page.parsed.listings || []);
  const pageSummaries = pageListings.map((listings) => pageTemporalSummary(listings, referenceDate));
  const allListings = pageListings.flat();
  const temporalOrdering = classifyOrdering(allListings, referenceDate);
  const duplicateBoundaries = pageListings.slice(1).map((listings, index) => ({ between: `page_${index + 1}_page_${index + 2}`, duplicateCount: overlap(pageListings[index], listings).length, externalIds: overlap(pageListings[index], listings).map((listing) => listing.externalId).slice(0, 5) }));
  const duplicateIds = allListings.length - new Set(allListings.map((listing) => listing.externalId)).size;
  const publishedAtValues = allListings.map((listing) => parsePublishedAt(listing.publishedAt, referenceDate));
  const comparable = publishedAtValues.filter((value) => value?.timestamp !== null);
  const orderingViolations = pageSummaries.reduce((total, summary) => total + summary.orderingViolations, 0);
  const crossPageViolations = pageSummaries.slice(1).reduce((total, summary, index) => {
    const previous = pageSummaries[index];
    if (!previous.oldestTimestamp || !summary.newestTimestamp) return total;
    return total + (Date.parse(previous.oldestTimestamp) < Date.parse(summary.newestTimestamp) ? 1 : 0);
  }, 0);
  const nextAnalysis = analyzeNextUrls(pages);
  const checkpointAnalysis = analyzeCheckpoints(pageListings, pageSummaries, referenceDate);
  const validIds = allListings.filter((listing) => /^IDJ[A-Za-z0-9]+$/i.test(listing.externalId)).length;
  const duplicatePublishedAtChanges = new Map();
  for (const listing of allListings) {
    const values = duplicatePublishedAtChanges.get(listing.externalId) || new Set();
    values.add(listing.publishedAt || "<missing>");
    duplicatePublishedAtChanges.set(listing.externalId, values);
  }
  const unstablePublishedAtIds = [...duplicatePublishedAtChanges.entries()].filter(([, values]) => values.size > 1).map(([externalId]) => externalId);

  console.log("OLX Incremental Acquisition / Checkpoint Diagnosis v0.1\n");
  console.log(`Selected category: ${selected.categoryName}`);
  console.log(`Search URL: ${selected.searchUrl}`);
  console.log(`Root request: HTTP ${root.status}, ${root.bytes} bytes, ${root.durationMs} ms`);
  console.log(`Pages captured: ${pages.length}; page requests: ${run.requests}; retries: ${run.retries}\n`);
  console.log("A. Feed ordering");
  console.log(`  Temporal ordering: ${temporalOrdering}`);
  console.log(`  Within-page ordering violations: ${orderingViolations}`);
  console.log(`  Cross-page range violations: ${crossPageViolations}`);
  pageSummaries.forEach((summary, index) => console.log(`  Page ${index + 1}: listings=${summary.listings}, newest=${summary.newestPublishedAt || "n/a"}, oldest=${summary.oldestPublishedAt || "n/a"}, comparable=${summary.comparableValues}, violations=${summary.orderingViolations}`));
  console.log("\nB. publishedAt");
  console.log(`  Present: ${allListings.length ? ((allListings.filter((listing) => listing.publishedAt).length / allListings.length) * 100).toFixed(2) : "0.00"}%`);
  console.log(`  Missing: ${allListings.filter((listing) => !listing.publishedAt).length}`);
  console.log(`  Invalid/unparseable: ${publishedAtValues.filter((value) => value?.kind === "unparseable").length}`);
  console.log(`  Unique raw values: ${new Set(allListings.map((listing) => listing.publishedAt).filter(Boolean)).size}`);
  console.log(`  Duplicate IDs with differing publishedAt: ${unstablePublishedAtIds.length}`);
  console.log("\nC. Pagination");
  console.log(`  Mechanism: ${nextAnalysis.mechanism}`);
  console.log(`  Stability: ${nextAnalysis.stability}`);
  console.log(`  Page parameter values: ${JSON.stringify(nextAnalysis.pageParameterValues)}`);
  nextAnalysis.transitions.forEach((transition) => console.log(`  ${transition.currentUrl} -> ${transition.nextUrl || "null"}`));
  console.log("\nD. External IDs and duplicates");
  console.log(`  Listings observed: ${allListings.length}`);
  console.log(`  Valid IDJ format: ${validIds}/${allListings.length}`);
  console.log(`  Unique externalIds: ${new Set(allListings.map((listing) => listing.externalId)).size}`);
  console.log(`  Duplicates across all pages: ${duplicateIds}`);
  duplicateBoundaries.forEach((boundary) => console.log(`  ${boundary.between}: ${boundary.duplicateCount} duplicates [${boundary.externalIds.join(", ")}]`));
  console.log("\nE. Checkpoint simulation");
  console.log(`  externalId checkpoint (last listing page 1): ${checkpointAnalysis.simulatedExternalIdCheckpoint || "n/a"}`);
  console.log(`  Found later: ${checkpointAnalysis.checkpointFoundOnLaterPages}`);
  console.log(`  First-page known-ID stop simulation: ${JSON.stringify(checkpointAnalysis.firstPageKnownIdsStopSimulation)}`);
  console.log(`  publishedAt watermark (oldest page 1): ${checkpointAnalysis.simulatedPublishedAtWatermark || "n/a"}`);
  console.log(`  Later listings at/after watermark: ${checkpointAnalysis.laterListingsAtOrAfterPublishedAtWatermark}`);
  console.log(`  Assessment: ${JSON.stringify(checkpointAnalysis.assessment)}`);
  console.log("\nF. Cost and evidence limits");
  console.log(`  Requests total including root: ${run.requests + 1}`);
  console.log(`  Pages: ${pages.length}`);
  console.log(`  Bytes including root: ${root.bytes + run.bytes}`);
  console.log(`  Page duration total: ${pages.reduce((total, page) => total + (page.durationMs || 0), 0)} ms`);
  console.log(`  Listings/page: ${pages.length ? (allListings.length / pages.length).toFixed(2) : "0.00"}`);
  console.log(`  Requests/listing: ${allListings.length ? ((run.requests + 1) / allListings.length).toFixed(4) : "n/a"}`);
  console.log(`  Sample IDs: ${allListings.slice(0, 8).map((listing) => `${listing.externalId} (${listing.publishedAt || "missing"})`).join(", ")}`);
  console.log("  Stability across separate runs: not measured by this single controlled run.");
  console.log("  Cross-provider entity resolution: not evaluated; parser fields remain externalId, title, price, location, publishedAt and url.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });