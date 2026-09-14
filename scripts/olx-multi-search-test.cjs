const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const babel = require("@babel/core");
const { CurlTransport, AcquisitionWorker } = require("../server/services/acquisition/index.cjs");

const searches = [
  {
    name: "apartamento-casa-a-venda",
    category: "imoveis / compra / apartamentos-casa",
    url: "https://www.olx.pt/imoveis/apartamento-casa-a-venda/"
  },
  {
    name: "imoveis-geral",
    category: "imoveis / geral",
    url: "https://www.olx.pt/imoveis/"
  },
  {
    name: "apartamentos-venda",
    category: "imoveis / compra / apartamentos",
    url: "https://www.olx.pt/imoveis/apartamento-casa-a-venda/apartamentos-venda/"
  },
  {
    name: "apartamentos-arrenda",
    category: "imoveis / arrendamento / apartamentos",
    url: "https://www.olx.pt/imoveis/apartamento-casa-a-venda/apartamentos-arrenda/"
  }
];

function loadParser() {
  const parserPath = path.resolve(__dirname, "../src/shared/provider-engine/olx/parsers.js");
  const source = fs.readFileSync(parserPath, "utf8");
  const { code } = babel.transformSync(source, {
    filename: parserPath,
    presets: [["@babel/preset-env", { modules: "commonjs" }]]
  });
  const module = { exports: {} };
  new Function("exports", "module", "require", code)(module.exports, module, require);
  return module.exports.parseOlxSearchPage;
}

function average(values) {
  const numeric = values.filter((value) => Number.isFinite(value));
  return numeric.length ? Number((numeric.reduce((sum, value) => sum + value, 0) / numeric.length).toFixed(2)) : 0;
}

function aggregate(name, category, url, pages) {
  const firstPages = pages.filter((page) => page.pageType === "first");
  const allListings = firstPages.flatMap((page) => page.parsed.listings);
  const first = firstPages[0];
  return {
    search: name,
    category,
    url,
    executions: firstPages.length,
    pagesTested: pages.length,
    requests: pages.reduce((total, page) => total + page.attempts, 0),
    requestsPerPage: pages.length ? Number((pages.reduce((total, page) => total + page.attempts, 0) / pages.length).toFixed(2)) : 0,
    statusCodes: [...new Set(pages.map((page) => page.acquisition.status || null))],
    cardsDetected: average(firstPages.map((page) => page.parsed.metrics.cardsDetected)),
    validListings: average(firstPages.map((page) => page.parsed.metrics.listingsParsed)),
    invalidListings: average(firstPages.map((page) => page.parsed.metrics.invalidIds)),
    externalLinksIgnored: average(firstPages.map((page) => page.parsed.metrics.externalLinksIgnored)),
    duplicatesRemoved: firstPages.reduce((total, page) => total + page.parsed.metrics.duplicatesRemoved, 0),
    nextUrl: first?.parsed.nextUrl || null,
    bytes: average(pages.map((page) => page.acquisition.bytes)),
    listingsPerPage: average(pages.map((page) => page.parsed.metrics.listingsParsed)),
    durationMs: average(pages.map((page) => page.acquisition.durationMs)),
    retries: pages.reduce((total, page) => total + page.acquisition.retryCount, 0),
    sampleListings: allListings.slice(0, 2).map(({ externalId, title, price, location, publishedAt, url: listingUrl }) => ({ externalId, title, price, location, publishedAt, url: listingUrl })),
    nativeIdSamples: [...new Set(allListings.map((listing) => listing.externalId))].slice(0, 3),
    parserAdditionalRequests: 0
  };
}

async function main() {
  global.DOMParser = new JSDOM("<!doctype html><html><body></body></html>").window.DOMParser;
  const parseOlxSearchPage = loadParser();
  const transport = new CurlTransport({ timeoutMs: 30000, connectTimeoutMs: 10000, maxRedirects: 5, maxResponseBytes: 5 * 1024 * 1024 });
  const worker = new AcquisitionWorker({ transport, maxRetries: 0, delayBetweenRequestsMs: 1500 });
  const summaries = [];

  for (const search of searches) {
    const pages = [];
    for (let run = 1; run <= 3; run += 1) {
      const acquisition = await worker.acquire(search.url);
      if (acquisition.errorType) throw new Error(`${search.name} run ${run}: ${acquisition.errorMessage}`);
      const parsed = parseOlxSearchPage(acquisition.body);
      const page = { run, pageType: "first", acquisition, parsed, attempts: acquisition.attempts || 1 };
      pages.push(page);
      console.log(JSON.stringify({ search: search.name, run, page: 1, status: acquisition.status, durationMs: acquisition.durationMs, bytes: acquisition.bytes, redirects: acquisition.redirects, retries: acquisition.retryCount, cardsDetected: parsed.metrics.cardsDetected, validListings: parsed.metrics.listingsParsed, invalidListings: parsed.metrics.invalidIds, externalLinksIgnored: parsed.metrics.externalLinksIgnored, nextUrl: parsed.nextUrl }));
    }

    if (["imoveis-geral", "apartamentos-venda"].includes(search.name)) {
      const nextUrl = pages[0].parsed.nextUrl;
      if (nextUrl) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const acquisition = await worker.acquire(nextUrl);
        if (acquisition.errorType) throw new Error(`${search.name} next page: ${acquisition.errorMessage}`);
        const parsed = parseOlxSearchPage(acquisition.body);
        pages.push({ run: 1, pageType: "next", acquisition, parsed, attempts: acquisition.attempts || 1 });
        console.log(JSON.stringify({ search: search.name, run: 1, page: 2, status: acquisition.status, durationMs: acquisition.durationMs, bytes: acquisition.bytes, redirects: acquisition.redirects, retries: acquisition.retryCount, cardsDetected: parsed.metrics.cardsDetected, validListings: parsed.metrics.listingsParsed, invalidListings: parsed.metrics.invalidIds, externalLinksIgnored: parsed.metrics.externalLinksIgnored, nextUrl: parsed.nextUrl }));
      }
    }

    summaries.push(aggregate(search.name, search.category, search.url, pages));
  }

  console.log(JSON.stringify({ runtime: process.version, totalSearches: searches.length, totalRequests: summaries.reduce((sum, item) => sum + item.requests, 0), totalPages: summaries.reduce((sum, item) => sum + item.pagesTested, 0), totalListings: summaries.reduce((sum, item) => sum + item.listingsPerPage * item.pagesTested, 0), additionalRequestsPerListing: 0, searches: summaries }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });