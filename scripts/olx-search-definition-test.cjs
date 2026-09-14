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
  const { discoverOlxCategories } = categoryDiscovery;
  const { buildOlxSearchDefinitions } = loadModule("../src/shared/provider-engine/olx/searchDefinitions.js", { "./categoryDiscovery": categoryDiscovery });
  const worker = new AcquisitionWorker({ transport: new CurlTransport({ timeoutMs: 30000, connectTimeoutMs: 10000, maxRedirects: 5, maxResponseBytes: 5 * 1024 * 1024 }), maxRetries: 0 });
  const acquisition = await worker.acquire("https://www.olx.pt/imoveis/");
  if (acquisition.errorType) throw new Error(acquisition.errorMessage);
  const discovery = discoverOlxCategories(acquisition.body);
  const definitions = buildOlxSearchDefinitions(discovery.categories);
  console.log(JSON.stringify({ requestedUrl: acquisition.requestedUrl, finalUrl: acquisition.finalUrl, status: acquisition.status, redirects: acquisition.redirects, retries: acquisition.retryCount, durationMs: acquisition.durationMs, bytes: acquisition.bytes, categories: discovery.categories, categoryMetrics: discovery.metrics, searchDefinitions: definitions.definitions, definitionMetrics: definitions.metrics, requestsMadeAfterRoot: 0 }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });