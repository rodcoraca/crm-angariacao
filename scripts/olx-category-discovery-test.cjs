const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const babel = require("@babel/core");
const { CurlTransport, AcquisitionWorker } = require("../server/services/acquisition/index.cjs");

function loadDiscovery() {
  const modulePath = path.resolve(__dirname, "../src/shared/provider-engine/olx/categoryDiscovery.js");
  const source = fs.readFileSync(modulePath, "utf8");
  const { code } = babel.transformSync(source, { filename: modulePath, presets: [["@babel/preset-env", { modules: "commonjs" }]] });
  const module = { exports: {} };
  new Function("exports", "module", "require", code)(module.exports, module, require);
  return module.exports.discoverOlxCategories;
}

async function main() {
  global.DOMParser = new JSDOM("<!doctype html><html><body></body></html>").window.DOMParser;
  const discoverOlxCategories = loadDiscovery();
  const worker = new AcquisitionWorker({ transport: new CurlTransport({ timeoutMs: 30000, connectTimeoutMs: 10000, maxRedirects: 5, maxResponseBytes: 5 * 1024 * 1024 }), maxRetries: 0 });
  const acquisition = await worker.acquire("https://www.olx.pt/imoveis/");
  if (acquisition.errorType) throw new Error(acquisition.errorMessage);
  const discovered = discoverOlxCategories(acquisition.body);
  console.log(JSON.stringify({ requestedUrl: acquisition.requestedUrl, finalUrl: acquisition.finalUrl, status: acquisition.status, redirects: acquisition.redirects, retries: acquisition.retryCount, durationMs: acquisition.durationMs, bytes: acquisition.bytes, categories: discovered.categories, metrics: discovered.metrics }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });