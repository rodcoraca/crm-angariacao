const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const babel = require("@babel/core");
const { CurlTransport, AcquisitionWorker } = require("../server/services/acquisition/index.cjs");

function loadModule(relativePath, dependencies = {}) {
  const modulePath = path.resolve(__dirname, relativePath);
  const source = fs.readFileSync(modulePath, "utf8");
  const { code } = babel.transformSync(source, { filename: modulePath, presets: [["@babel/preset-env", { modules: "commonjs" }]] });
  const module = { exports: {} };
  const resolve = (request) => dependencies[request] || require(request);
  new Function("exports", "module", "require", code)(module.exports, module, resolve);
  return module.exports;
}

async function main() {
  global.DOMParser = new JSDOM("<!doctype html><html><body></body></html>").window.DOMParser;
  const categoryDiscovery = loadModule("../src/shared/provider-engine/olx/categoryDiscovery.js");
  const { buildOlxSearchDefinitions } = loadModule("../src/shared/provider-engine/olx/searchDefinitions.js", { "./categoryDiscovery": categoryDiscovery });
  const { parseOlxSearchPage } = loadModule("../src/shared/provider-engine/olx/parsers.js");
  const { acquireOlxSearchPages } = loadModule("../src/shared/provider-engine/olx/paginatedAcquisition.js");
  const worker = new AcquisitionWorker({ transport: new CurlTransport({ timeoutMs: 30000, connectTimeoutMs: 10000, maxRedirects: 5, maxResponseBytes: 5 * 1024 * 1024 }), maxRetries: 0 });

  console.log("OLX Paginated Acquisition v0.1\n");
  const root = await worker.acquire("https://www.olx.pt/imoveis/", { maxRetries: 0 });
  if (root.errorType) throw new Error(root.errorMessage);
  const discovery = categoryDiscovery.discoverOlxCategories(root.body);
  const built = buildOlxSearchDefinitions(discovery.categories);
  const selected = built.definitions[0];
  const result = await acquireOlxSearchPages(selected, { worker, parseSearchPage: parseOlxSearchPage, maxPages: 3, maxRequests: 3, maxRetries: 0, maxRedirects: 5, delayBetweenRequestsMs: 1500 });

  console.log(`Category: ${selected.categoryName}\n`);
  result.pages.forEach((page) => {
    console.log(`Page ${page.pageNumber}`);
    console.log(`  URL: ${page.requestedUrl}`);
    console.log(`  HTTP: ${page.httpStatus || "ERROR"}`);
    console.log(`  Listings: ${page.listingsFound}`);
    console.log(`  Next: ${page.nextUrl ? "yes" : "no"}`);
    console.log(`  Duration: ${page.durationMs} ms\n`);
  });
  console.log("Summary");
  console.log(`  Pages fetched: ${result.metrics.pagesFetched}`);
  console.log(`  Requests: ${result.metrics.requests + 1} (including root)`);
  console.log(`  Successful pages: ${result.metrics.successfulPages}`);
  console.log(`  Failed pages: ${result.metrics.failedPages}`);
  console.log(`  Listings: ${result.metrics.totalListings}`);
  console.log(`  Unique IDs: ${result.metrics.uniqueExternalIds}`);
  console.log(`  Duplicates removed: ${result.metrics.duplicatesRemoved}`);
  console.log(`  Bytes: ${root.bytes + result.metrics.totalBytes}`);
  console.log(`  Duration: ${result.metrics.durationMs} ms`);
  console.log(`  Average listings/page: ${result.metrics.averageListingsPerPage}`);
  console.log(`  Stop reason: ${result.metrics.paginationStoppedReason}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });