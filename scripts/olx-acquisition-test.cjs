const { CurlTransport, AcquisitionWorker } = require("../server/services/acquisition/index.cjs");

const urls = {
  P1: "https://www.olx.pt/imoveis/apartamento-casa-a-venda/",
  P2: "https://www.olx.pt/imoveis/apartamento-casa-a-venda/?page=2"
};
const markers = { anuncio: /\/d\/anuncio\//g, IDJ: /IDJ/gi, cardTitleLink: /card-title-link/g, adPrice: /ad-price/g, locationDate: /location-date/g };

function classify(result) {
  if (result.errorType === "http_error" && result.status === 403) return "C_BLOCKED";
  if (result.errorType && result.errorType !== "http_error") return "E_TRANSPORT_ERROR";
  if (result.status === 200 && /html/i.test(result.contentType || "") && markers.anuncio.test(result.body) && /IDJ/i.test(result.body)) return "A_SUCCESS";
  if (result.status === 200) return "B_HTTP_200_WITHOUT_EXPECTED_CONTENT";
  return "D_OTHER_HTTP";
}

function count(body, regex) { regex.lastIndex = 0; return (body.match(regex) || []).length; }
function average(values) { return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : 0; }

async function main() {
  const transport = new CurlTransport({ timeoutMs: 30000, connectTimeoutMs: 10000, maxRedirects: 5, maxResponseBytes: 5 * 1024 * 1024 });
  const worker = new AcquisitionWorker({ transport, maxRetries: 0, delayBetweenRequestsMs: 1500 });
  const results = [];
  for (const [label, url] of Object.entries(urls)) {
    for (let run = 1; run <= 5; run += 1) {
      const execution = await worker.acquire(url);
      const item = { run, label, requestedUrl: execution.requestedUrl, finalUrl: execution.finalUrl || null, status: execution.status || null, statusText: execution.statusText || null, durationMs: execution.durationMs || null, bytes: execution.bytes || 0, redirects: execution.redirects || 0, contentType: execution.contentType || null, exitCode: execution.exitCode ?? null, retryCount: execution.retryCount, classification: classify(execution), indicators: execution.body ? Object.fromEntries(Object.entries(markers).map(([name, regex]) => [name, count(execution.body, regex)])) : null, error: execution.errorMessage || null };
      results.push(item);
      console.log(JSON.stringify(item));
    }
  }
  const summary = {};
  for (const label of Object.keys(urls)) {
    const subset = results.filter((item) => item.label === label);
    summary[label] = { successRate: subset.filter((item) => item.classification === "A_SUCCESS").length / subset.length, blockedRate: subset.filter((item) => item.classification === "C_BLOCKED").length / subset.length, averageDurationMs: average(subset.map((item) => item.durationMs).filter(Number.isFinite)), averageBytes: average(subset.map((item) => item.bytes)), averageRedirects: average(subset.map((item) => item.redirects)), averageRetries: average(subset.map((item) => item.retryCount)), requestsPerRun: average(subset.map(() => 1)), pagesPerRun: 1, indicatorsPerPage: Object.fromEntries(Object.keys(markers).map((name) => [name, average(subset.map((item) => item.indicators?.[name] || 0))])) };
  }
  console.log(JSON.stringify({ runtime: process.version, results, summary }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });