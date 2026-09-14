const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const babel = require("@babel/core");
const { CurlTransport, AcquisitionWorker } = require("../server/services/acquisition/index.cjs");
const { runOlxCategoryAcquisition } = require("./olx-category-acquisition-harness.cjs");

function loadModule(relativePath, dependencies = {}) {
  const modulePath = path.resolve(__dirname, relativePath);
  const source = fs.readFileSync(modulePath, "utf8");
  const { code } = babel.transformSync(source, { filename: modulePath, presets: [["@babel/preset-env", { modules: "commonjs" }]] });
  const module = { exports: {} };
  const resolve = (request) => dependencies[request] || require(request);
  new Function("exports", "module", "require", code)(module.exports, module, resolve);
  return module.exports;
}

function printResult(result, index, total) {
  console.log(`[${index}/${total}] ${result.categoryName}`);
  console.log(`  URL: ${result.searchUrl}`);
  console.log(`  HTTP: ${result.httpStatus || "ERROR"}`);
  console.log(`  Listings: ${result.listingsFound}`);
  console.log(`  Next: ${result.nextUrl ? "yes" : "no"}`);
  console.log(`  Duration: ${result.durationMs} ms`);
  if (result.error) console.log(`  Error: ${result.error}`);
}

async function main() {
  global.DOMParser = new JSDOM("<!doctype html><html><body></body></html>").window.DOMParser;
  const categoryDiscovery = loadModule("../src/shared/provider-engine/olx/categoryDiscovery.js");
  const { buildOlxSearchDefinitions } = loadModule("../src/shared/provider-engine/olx/searchDefinitions.js", { "./categoryDiscovery": categoryDiscovery });
  const { parseOlxSearchPage } = loadModule("../src/shared/provider-engine/olx/parsers.js");
  const worker = new AcquisitionWorker({ transport: new CurlTransport({ timeoutMs: 30000, connectTimeoutMs: 10000, maxRedirects: 5, maxResponseBytes: 5 * 1024 * 1024 }), maxRetries: 0, delayBetweenRequestsMs: 1500 });

  console.log("OLX Category Acquisition v0.1\n");
  const root = await worker.acquire("https://www.olx.pt/imoveis/", { maxRetries: 0 });
  if (root.errorType) throw new Error(root.errorMessage);
  const discovery = categoryDiscovery.discoverOlxCategories(root.body);
  const built = buildOlxSearchDefinitions(discovery.categories);
  console.log("Root");
  console.log(`  URL: ${root.requestedUrl}`);
  console.log(`  HTTP: ${root.status}`);
  console.log(`  Duration: ${root.durationMs} ms`);
  console.log(`  Categories: ${discovery.categories.length}\n`);
  console.log("Searches\n");

  const acquisition = await runOlxCategoryAcquisition(built.definitions, { worker, parseSearchPage: parseOlxSearchPage, delayBetweenRequestsMs: 1500 });
  acquisition.results.forEach((result, index) => printResult(result, index + 1, built.definitions.length));
  const totalRequests = 1 + acquisition.metrics.totalRequests;
  console.log("\nSummary\n");
  console.log(`Categories discovered: ${discovery.categories.length}`);
  console.log(`Search definitions: ${built.definitions.length}`);
  console.log(`Searches attempted: ${acquisition.metrics.searchesAttempted}`);
  console.log(`Succeeded: ${acquisition.metrics.searchesSucceeded}`);
  console.log(`Failed: ${acquisition.metrics.searchesFailed}`);
  console.log(`Requests: ${totalRequests}`);
  console.log(`Listings: ${acquisition.metrics.totalListings}`);
  console.log(`Unique external IDs: ${acquisition.metrics.uniqueExternalIds}`);
  console.log(`Bytes: ${root.bytes + acquisition.metrics.totalBytes}`);
  console.log(`Avg duration: ${acquisition.metrics.averageDurationMs} ms`);
  console.log(`Avg listings/search: ${acquisition.metrics.averageListingsPerSearch}`);
  console.log(`External listings ignored: ${acquisition.metrics.externalListingsIgnored}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });