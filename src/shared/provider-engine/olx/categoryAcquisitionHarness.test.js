const { runOlxCategoryAcquisition } = require("../../../../scripts/olx-category-acquisition-harness.cjs");

const definitions = [
  { provider: "olx", categoryName: "A", categoryUrl: "https://www.olx.pt/imoveis/a/", searchUrl: "https://www.olx.pt/imoveis/a/", type: "category" },
  { provider: "olx", categoryName: "B", categoryUrl: "https://www.olx.pt/imoveis/b/", searchUrl: "https://www.olx.pt/imoveis/b/", type: "category" }
];

describe("OLX Category Acquisition Harness v0.1", () => {
  it("adquire uma Search Definition e passa o HTML ao parser", async () => {
    const calls = [];
    const worker = { acquire: async (url, options) => { calls.push({ url, options }); return { status: 200, body: "<html>A</html>", durationMs: 12, bytes: 10 }; } };
    const parseSearchPage = jest.fn(() => ({ listings: [{ externalId: "IDJ1", url: "https://www.olx.pt/d/anuncio/a-IDJ1.html" }], nextUrl: "https://www.olx.pt/imoveis/a/?page=2", metrics: { externalLinksIgnored: 2 } }));
    const result = await runOlxCategoryAcquisition([definitions[0]], { worker, parseSearchPage, delayBetweenRequestsMs: 0 });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ url: definitions[0].searchUrl, options: { maxRetries: 0 } });
    expect(parseSearchPage).toHaveBeenCalledWith("<html>A</html>");
    expect(result.results[0]).toMatchObject({ httpStatus: 200, listingsFound: 1, nextUrl: "https://www.olx.pt/imoveis/a/?page=2", externalIds: ["IDJ1"], externalListingsIgnored: 2 });
  });

  it("continua para as restantes pesquisas quando uma aquisição falha", async () => {
    let calls = 0;
    const worker = { acquire: async () => { calls += 1; if (calls === 1) return { errorType: "http_error", errorMessage: "HTTP 500", status: 500 }; return { status: 200, body: "ok", bytes: 1, durationMs: 1 }; } };
    const result = await runOlxCategoryAcquisition(definitions, { worker, parseSearchPage: () => ({ listings: [] }), delayBetweenRequestsMs: 0 });
    expect(result.metrics).toMatchObject({ searchesAttempted: 2, searchesSucceeded: 1, searchesFailed: 1 });
  });

  it("não faz requests de detalhe nem segue nextUrl", async () => {
    const urls = [];
    const worker = { acquire: async (url) => { urls.push(url); return { status: 200, body: "ok", bytes: 1, durationMs: 1 }; } };
    await runOlxCategoryAcquisition(definitions, { worker, parseSearchPage: () => ({ listings: [{ externalId: "IDJ1" }], nextUrl: "https://www.olx.pt/d/anuncio/detail-IDJ1.html" }), delayBetweenRequestsMs: 0 });
    expect(urls).toEqual(definitions.map((definition) => definition.searchUrl));
  });

  it("não muta as Search Definitions e envia maxRetries igual a zero", async () => {
    const input = JSON.parse(JSON.stringify(definitions));
    const options = [];
    const worker = { acquire: async (_url, workerOptions) => { options.push(workerOptions); return { status: 200, body: "ok", bytes: 1, durationMs: 1 }; } };
    await runOlxCategoryAcquisition(input, { worker, parseSearchPage: () => ({ listings: [] }), delayBetweenRequestsMs: 0 });
    expect(input).toEqual(definitions);
    expect(options).toEqual([{ maxRetries: 0 }, { maxRetries: 0 }]);
  });

  it("executa as pesquisas sequencialmente", async () => {
    let active = 0;
    let maximumActive = 0;
    const worker = { acquire: async () => { active += 1; maximumActive = Math.max(maximumActive, active); await Promise.resolve(); active -= 1; return { status: 200, body: "ok", bytes: 1, durationMs: 1 }; } };
    await runOlxCategoryAcquisition(definitions, { worker, parseSearchPage: () => ({ listings: [] }), delayBetweenRequestsMs: 0 });
    expect(maximumActive).toBe(1);
  });
});