const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const babel = require("@babel/core");
const { CurlTransport, AcquisitionWorker } = require("../server/services/acquisition/index.cjs");

const MAX_PAGES = 5;
const MAX_REQUESTS = 5;
const SNAPSHOT_INTERVAL_MS = Number(process.env.OLX_SNAPSHOT_INTERVAL_MS || 5 * 60 * 1000);
const MONTHS = {
  janeiro: 0, fevereiro: 1, marco: 2, março: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
};

function loadModule(relativePath, dependencies = {}) {
  const modulePath = path.resolve(__dirname, relativePath);
  const source = fs.readFileSync(modulePath, "utf8");
  const { code } = babel.transformSync(source, {
    filename: modulePath,
    presets: [["@babel/preset-env", { modules: "commonjs" }]]
  });
  const module = { exports: {} };
  const resolve = (request) => dependencies[request] || require(request);
  new Function("exports", "module", "require", code)(module.exports, module, resolve);
  return module.exports;
}

function parsePublishedAt(value, referenceDate) {
  if (!value) return { raw: value || null, timestamp: null, kind: "missing" };
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

function firstById(listings) {
  const result = new Map();
  listings.forEach((listing, index) => {
    if (!result.has(listing.externalId)) result.set(listing.externalId, { listing, index });
  });
  return result;
}

function ids(listings) {
  return new Set(listings.map((listing) => listing.externalId));
}

function analyzeOrdering(listings, referenceDate) {
  const parsed = listings.map((listing) => parsePublishedAt(listing.publishedAt, referenceDate));
  const comparable = parsed.filter((value) => value.timestamp !== null);
  let violations = 0;
  for (let index = 1; index < comparable.length; index += 1) {
    if (comparable[index - 1].timestamp < comparable[index].timestamp) violations += 1;
  }
  let classification = "UNKNOWN";
  if (comparable.length === listings.length && comparable.length >= 2) {
    classification = violations === 0 ? "MONOTONIC" : violations / (comparable.length - 1) <= 0.1 ? "MOSTLY_MONOTONIC" : "NON_MONOTONIC";
  }
  return {
    classification,
    violations,
    coverage: listings.length ? (listings.filter((listing) => listing.publishedAt).length / listings.length) * 100 : 0,
    uniqueValues: new Set(listings.map((listing) => listing.publishedAt).filter(Boolean)).size,
    missing: parsed.filter((value) => value.kind === "missing").length,
    invalid: parsed.filter((value) => value.kind === "unparseable").length
  };
}

function compareSnapshots(earlier, later) {
  const earlierIds = ids(earlier.listings);
  const laterIds = ids(later.listings);
  const both = [...earlierIds].filter((id) => laterIds.has(id));
  const onlyEarlier = [...earlierIds].filter((id) => !laterIds.has(id));
  const onlyLater = [...laterIds].filter((id) => !earlierIds.has(id));
  const earlierById = firstById(earlier.listings);
  const laterById = firstById(later.listings);
  const fields = ["publishedAt", "price", "title", "url"];
  const stability = {};
  fields.forEach((field) => {
    const changed = both.filter((id) => earlierById.get(id).listing[field] !== laterById.get(id).listing[field]);
    stability[field] = {
      stable: both.length - changed.length,
      changed: changed.length,
      stableRate: both.length ? ((both.length - changed.length) / both.length) * 100 : null,
      examples: changed.slice(0, 3).map((id) => ({ id, earlier: earlierById.get(id).listing[field], later: laterById.get(id).listing[field] }))
    };
  });
  const positionChanges = both.map((id) => {
    const before = earlierById.get(id);
    const after = laterById.get(id);
    return {
      id,
      positionEarlier: before.index + 1,
      positionLater: after.index + 1,
      positionDelta: after.index - before.index,
      pageEarlier: before.listing.pageNumber,
      pageLater: after.listing.pageNumber
    };
  });
  const absoluteDeltas = positionChanges.map((entry) => Math.abs(entry.positionDelta));
  const samePosition = positionChanges.filter((entry) => entry.positionDelta === 0).length;
  const samePage = positionChanges.filter((entry) => entry.pageEarlier === entry.pageLater).length;
  return {
    from: earlier.number,
    to: later.number,
    idsInBoth: both.length,
    idsOnlyInEarlier: onlyEarlier.length,
    idsOnlyInLater: onlyLater.length,
    retentionRate: earlierIds.size ? (both.length / earlierIds.size) * 100 : 0,
    newIds: onlyLater.length,
    removedIds: onlyEarlier.length,
    position: {
      compared: positionChanges.length,
      samePosition,
      movedPosition: positionChanges.length - samePosition,
      movedPage: positionChanges.filter((entry) => entry.pageEarlier !== entry.pageLater).length,
      positionStableRate: positionChanges.length ? (samePosition / positionChanges.length) * 100 : null,
      pageStableRate: positionChanges.length ? (samePage / positionChanges.length) * 100 : null,
      averageAbsolutePositionDelta: absoluteDeltas.length ? absoluteDeltas.reduce((sum, value) => sum + value, 0) / absoluteDeltas.length : null,
      maxPositionDelta: absoluteDeltas.length ? Math.max(...absoluteDeltas) : null
    },
    fields: stability
  };
}

function compareNextUrls(snapshots) {
  const maxPages = Math.max(...snapshots.map((snapshot) => snapshot.pages.length));
  return Array.from({ length: maxPages }, (_, index) => {
    const values = snapshots.map((snapshot) => snapshot.pages[index]?.nextUrl || null);
    return { page: index + 1, values, identical: new Set(values).size === 1 };
  });
}

function checkpointReport(earlier, later) {
  const firstPageCheckpoint = earlier.pages[0]?.listings.at(-1)?.externalId || null;
  const snapshotCheckpoint = earlier.listings.at(-1)?.externalId || null;
  const laterById = firstById(later.listings);
  const evaluate = (checkpoint) => {
    if (!checkpoint || !laterById.has(checkpoint)) return { checkpoint, found: false, listingsAfter: null, newListingsAfter: null };
    const position = laterById.get(checkpoint).index;
    const after = later.listings.slice(position + 1);
    return {
      checkpoint,
      found: true,
      position: position + 1,
      listingsAfter: after.length,
      newListingsAfter: after.filter((listing) => !ids(earlier.listings).has(listing.externalId)).length
    };
  };
  return { firstPageCheckpoint: evaluate(firstPageCheckpoint), snapshotCheckpoint: evaluate(snapshotCheckpoint) };
}

function lookbackReport(earlier, later) {
  return [1, 2, 3, 5].map((pageCount) => {
    const earlierWindow = ids(earlier.pages.slice(0, pageCount).flatMap((page) => page.listings));
    const laterWindow = ids(later.pages.slice(0, pageCount).flatMap((page) => page.listings));
    const overlap = [...laterWindow].filter((id) => earlierWindow.has(id)).length;
    return {
      pages: pageCount,
      earlierUniqueIds: earlierWindow.size,
      laterUniqueIds: laterWindow.size,
      idsRetainedInSameWindow: overlap,
      retentionRate: laterWindow.size ? (overlap / laterWindow.size) * 100 : 0
    };
  });
}

async function captureSnapshot(worker, parser, searchUrl, number) {
  const capturedAt = new Date();
  const parsedPages = new Map();
  const run = await worker.run({
    url: searchUrl,
    maxPages: MAX_PAGES,
    maxRequests: MAX_REQUESTS,
    maxRetries: 0,
    delayBetweenRequestsMs: 1500,
    nextUrlResolver: (page) => {
      const parsed = parser(page.body);
      parsedPages.set(page.requestedUrl, parsed);
      return parsed.nextUrl;
    }
  });
  let positionOffset = 0;
  const pages = run.pages.map((page, pageIndex) => {
    const parsed = parsedPages.get(page.requestedUrl) || parser(page.body);
    const listings = (parsed.listings || []).map((listing, index) => ({
      ...listing,
      position: positionOffset + index + 1,
      pageNumber: pageIndex + 1
    }));
    positionOffset += listings.length;
    return { requestedUrl: page.requestedUrl, nextUrl: parsed.nextUrl || null, listings, bytes: page.bytes || 0, durationMs: page.durationMs || 0 };
  });
  const listings = pages.flatMap((page) => page.listings);
  const uniqueIds = ids(listings);
  const duplicateCount = listings.length - uniqueIds.size;
  const duplicateBoundaries = pages.slice(1).map((page, index) => {
    const previousIds = ids(pages[index].listings);
    return { between: `page_${index + 1}_page_${index + 2}`, duplicateCount: page.listings.filter((listing) => previousIds.has(listing.externalId)).length };
  });
  const ordering = analyzeOrdering(listings, capturedAt);
  return {
    number,
    capturedAt,
    pages,
    listings,
    uniqueIds,
    duplicateCount,
    duplicateBoundaries,
    ordering,
    requests: run.requests,
    retries: run.retries,
    bytes: run.bytes,
    durationMs: pages.reduce((sum, page) => sum + page.durationMs, 0)
  };
}

function printSnapshot(snapshot) {
  const listingCount = snapshot.listings.length;
  console.log(`Snapshot ${snapshot.number}:`);
  console.log(`  timestamp: ${snapshot.capturedAt.toISOString()}`);
  console.log(`  pages=${snapshot.pages.length}, requests=${snapshot.requests}, retries=${snapshot.retries}, listings=${listingCount}, uniqueIds=${snapshot.uniqueIds.size}`);
  console.log(`  bytes=${snapshot.bytes}, duration=${snapshot.durationMs} ms, listings/page=${snapshot.pages.length ? (listingCount / snapshot.pages.length).toFixed(2) : "0.00"}`);
  console.log(`  bytes/listing=${listingCount ? (snapshot.bytes / listingCount).toFixed(2) : "n/a"}, requests/listing=${listingCount ? (snapshot.requests / listingCount).toFixed(4) : "n/a"}`);
  console.log(`  ordering=${snapshot.ordering.classification}, violations=${snapshot.ordering.violations}, publishedAt coverage=${snapshot.ordering.coverage.toFixed(2)}%, unique values=${snapshot.ordering.uniqueValues}, missing=${snapshot.ordering.missing}, invalid=${snapshot.ordering.invalid}`);
  console.log(`  duplicates=${snapshot.duplicateCount}, boundaries=${JSON.stringify(snapshot.duplicateBoundaries)}`);
  console.log(`  nextUrls=${JSON.stringify(snapshot.pages.map((page) => page.nextUrl))}`);
}

function printComparison(comparison) {
  console.log(`T${comparison.from} -> T${comparison.to}: both=${comparison.idsInBoth}, earlierOnly=${comparison.idsOnlyInEarlier}, laterOnly=${comparison.idsOnlyInLater}, retention=${comparison.retentionRate.toFixed(2)}%`);
  console.log(`  position: stable=${comparison.position.positionStableRate?.toFixed(2) || "n/a"}%, page=${comparison.position.pageStableRate?.toFixed(2) || "n/a"}%, avgAbsDelta=${comparison.position.averageAbsolutePositionDelta?.toFixed(2) || "n/a"}, maxDelta=${comparison.position.maxPositionDelta ?? "n/a"}`);
  ["publishedAt", "price", "title", "url"].forEach((field) => console.log(`  ${field}: stable=${comparison.fields[field].stableRate?.toFixed(2) || "n/a"}%, changed=${comparison.fields[field].changed}`));
  console.log(`  checkpoint: ${JSON.stringify(comparison.checkpoint)}`);
  console.log(`  lookback: ${JSON.stringify(comparison.lookback)}`);
}

async function main() {
  global.DOMParser = new JSDOM("<!doctype html><html><body></body></html>").window.DOMParser;
  const categoryDiscovery = loadModule("../src/shared/provider-engine/olx/categoryDiscovery.js");
  const { buildOlxSearchDefinitions } = loadModule("../src/shared/provider-engine/olx/searchDefinitions.js", { "./categoryDiscovery": categoryDiscovery });
  const { parseOlxSearchPage } = loadModule("../src/shared/provider-engine/olx/parsers.js");
  const transport = new CurlTransport({ timeoutMs: 30000, connectTimeoutMs: 10000, maxRedirects: 5, maxResponseBytes: 5 * 1024 * 1024 });
  const worker = new AcquisitionWorker({ transport, maxRetries: 0, delayBetweenRequestsMs: 1500 });
  const root = await worker.acquire("https://www.olx.pt/imoveis/", { maxRetries: 0 });
  if (root.errorType) throw new Error(root.errorMessage);
  const discovery = categoryDiscovery.discoverOlxCategories(root.body);
  const built = buildOlxSearchDefinitions(discovery.categories);
  const selected = built.definitions.find((definition) => definition.categoryName === "Apartamentos") || built.definitions[0];
  if (!selected) throw new Error("Nenhuma Search Definition OLX foi descoberta.");

  console.log("OLX Longitudinal Feed Stability Diagnosis v0.1\n");
  console.log(`Category: ${selected.categoryName}`);
  console.log(`Search URL: ${selected.searchUrl}`);
  console.log(`Configured interval: ${SNAPSHOT_INTERVAL_MS} ms (${(SNAPSHOT_INTERVAL_MS / 60000).toFixed(2)} min)`);
  console.log(`Discovery: ${discovery.categories.length} categories from one root request (${root.bytes} bytes, ${root.durationMs} ms)\n`);

  const snapshots = [];
  let previousCapturedAt = null;
  for (let number = 1; number <= 3; number += 1) {
    if (number > 1) {
      const waitStarted = Date.now();
      await new Promise((resolve) => setTimeout(resolve, SNAPSHOT_INTERVAL_MS));
      console.log(`Waited ${Date.now() - waitStarted} ms before snapshot ${number}.`);
    }
    const snapshot = await captureSnapshot(worker, parseOlxSearchPage, selected.searchUrl, number);
    snapshot.elapsedSincePreviousMs = previousCapturedAt ? snapshot.capturedAt.getTime() - previousCapturedAt.getTime() : null;
    snapshots.push(snapshot);
    printSnapshot(snapshot);
    if (snapshot.elapsedSincePreviousMs !== null) console.log(`  elapsed since previous snapshot: ${snapshot.elapsedSincePreviousMs} ms (${(snapshot.elapsedSincePreviousMs / 60000).toFixed(2)} min)`);
    previousCapturedAt = snapshot.capturedAt;
    console.log("");
  }

  console.log("Comparisons\n");
  for (const [earlierIndex, laterIndex] of [[0, 1], [1, 2], [0, 2]]) {
    const comparison = compareSnapshots(snapshots[earlierIndex], snapshots[laterIndex]);
    comparison.checkpoint = checkpointReport(snapshots[earlierIndex], snapshots[laterIndex]);
    comparison.lookback = lookbackReport(snapshots[earlierIndex], snapshots[laterIndex]);
    printComparison(comparison);
  }

  console.log("\nPagination stability");
  compareNextUrls(snapshots).forEach((entry) => console.log(`  page ${entry.page}: identical=${entry.identical}, nextUrls=${JSON.stringify(entry.values)}`));
  const orderingClasses = snapshots.map((snapshot) => snapshot.ordering.classification);
  console.log(`\nOrdering classifications: ${orderingClasses.join(" -> ")}`);
  console.log(`publishedAt/order classification stable: ${new Set(orderingClasses).size === 1}`);
  console.log("\nAssessment");
  console.log("  externalId stop: UNSAFE unless every future page beyond the checkpoint is exhaustively proven stable; observed comparisons report unseen listings after checkpoints.");
  console.log("  publishedAt watermark: UNSAFE until values are proven immutable and monotonically ordered across repeated snapshots.");
  console.log("  page checkpoint: UNSAFE because page boundaries and membership are observations, not a provider cursor.");
  console.log("  production recommendation: fixed lookback + deduplication + periodic full scan; no strategy was implemented.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });