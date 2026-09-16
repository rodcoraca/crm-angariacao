import { acquireOlxSearchPages } from "./paginatedAcquisition";
import { createOlxExecutionBudget } from "./executionBudget";

const definition = { provider: "olx", categoryName: "Apartamentos", categoryUrl: "https://www.olx.pt/imoveis/apartamentos/", searchUrl: "https://www.olx.pt/imoveis/apartamentos/", type: "category" };
const page = (requestedUrl, nextUrl, listings = []) => ({ status: 200, requestedUrl, bytes: 10, durationMs: 1, body: { nextUrl, listings } });
const run = (responses, options = {}) => {
  const calls = [];
  const worker = { acquire: async (url, workerOptions) => { calls.push({ url, workerOptions }); const response = responses.shift(); return typeof response === "function" ? response(url) : response; } };
  const parseSearchPage = (html) => html;
  return acquireOlxSearchPages(definition, { worker, parseSearchPage, delayBetweenRequestsMs: 0, ...options }).then((result) => ({ result, calls }));
};

describe("OLX Paginated Acquisition v0.1", () => {
  it("faz uma página quando não existe nextUrl", async () => {
    const { result, calls } = await run([page(definition.searchUrl, null, [{ externalId: "IDJ1" }])]);
    expect(calls).toHaveLength(1);
    expect(result.metrics).toMatchObject({ pagesFetched: 1, requests: 1, paginationStoppedReason: "no_next_url", totalListings: 1 });
  });

  it("segue duas páginas através do nextUrl do parser", async () => {
    const { result, calls } = await run([page(definition.searchUrl, "https://www.olx.pt/imoveis/apartamentos/?page=2", [{ externalId: "IDJ1" }]), page("https://www.olx.pt/imoveis/apartamentos/?page=2", null, [{ externalId: "IDJ2" }])]);
    expect(calls.map((call) => call.url)).toEqual([definition.searchUrl, "https://www.olx.pt/imoveis/apartamentos/?page=2"]);
    expect(result.metrics).toMatchObject({ pagesFetched: 2, requests: 2, totalListings: 2, paginationStoppedReason: "no_next_url" });
  });

  it("respeita maxPages e maxRequests", async () => {
    const responses = Array.from({ length: 5 }, (_, index) => page(`https://www.olx.pt/imoveis/apartamentos/?page=${index + 1}`, `https://www.olx.pt/imoveis/apartamentos/?page=${index + 2}`, [{ externalId: `IDJ${index}` }]));
    const byPages = await run(responses.slice(), { maxPages: 3, maxRequests: 5 });
    expect(byPages.result.metrics).toMatchObject({ pagesFetched: 3, requests: 3, paginationStoppedReason: "max_pages" });
    const byRequests = await run(responses.slice(), { maxPages: 5, maxRequests: 2 });
    expect(byRequests.result.metrics).toMatchObject({ pagesFetched: 2, requests: 2, paginationStoppedReason: "max_requests" });
  });

  it("impede loops de URLs visitadas", async () => {
    const { result, calls } = await run([page(definition.searchUrl, "https://www.olx.pt/imoveis/apartamentos/?page=2", [{ externalId: "IDJ1" }]), page("https://www.olx.pt/imoveis/apartamentos/?page=2", definition.searchUrl, [{ externalId: "IDJ2" }])]);
    expect(calls).toHaveLength(2);
    expect(result.metrics.paginationStoppedReason).toBe("visited_url");
  });

  it("não requisita nextUrl inválida", async () => {
    const { result, calls } = await run([page(definition.searchUrl, "https://www.imovirtual.com/imoveis/?page=2", [{ externalId: "IDJ1" }])]);
    expect(calls).toHaveLength(1);
    expect(result.metrics.paginationStoppedReason).toBe("invalid_next_url");
  });

  it("deduplica listings globalmente apenas por externalId", async () => {
    const { result } = await run([page(definition.searchUrl, "https://www.olx.pt/imoveis/apartamentos/?page=2", [{ externalId: "IDJ1", title: "A" }]), page("https://www.olx.pt/imoveis/apartamentos/?page=2", null, [{ externalId: "IDJ1", title: "B" }, { externalId: "IDJ2", title: "C" }])]);
    expect(result.listings.map((listing) => listing.title)).toEqual(["A", "C"]);
    expect(result.metrics.duplicatesRemoved).toBe(1);
  });

  it("preserva páginas anteriores quando uma aquisição falha", async () => {
    const { result } = await run([page(definition.searchUrl, "https://www.olx.pt/imoveis/apartamentos/?page=2", [{ externalId: "IDJ1" }]), { status: 500, errorType: "http_error", errorMessage: "HTTP 500", bytes: 0, durationMs: 2 }]);
    expect(result.listings).toHaveLength(1);
    expect(result.metrics).toMatchObject({ pagesFetched: 2, successfulPages: 1, failedPages: 1, paginationStoppedReason: "acquisition_error" });
  });

  it("faz apenas requests de páginas, em sequência, com maxRetries zero", async () => {
    const { calls } = await run([page(definition.searchUrl, null)], { maxRetries: 0 });
    expect(calls).toEqual([{ url: definition.searchUrl, workerOptions: { maxRetries: 0, maxRedirects: 5 } }]);
  });

  it("não modifica a Search Definition", async () => {
    const input = JSON.parse(JSON.stringify(definition));
    await run([page(definition.searchUrl, null)]);
    expect(input).toEqual(definition);
  });

  it("para antes da próxima request quando o limite global de pesquisa termina", async () => {
    const budget = createOlxExecutionBudget({
      maxSearchPagesPerCategory: 5,
      maxSearchRequests: 1
    }, Date.now());
    const { result, calls } = await run([
      page(definition.searchUrl, "https://www.olx.pt/imoveis/apartamentos/?page=2", [{ externalId: "IDJ1" }]),
      page("https://www.olx.pt/imoveis/apartamentos/?page=2", null, [{ externalId: "IDJ2" }])
    ], { budget });

    expect(calls).toHaveLength(1);
    expect(result.listings).toHaveLength(1);
    expect(result.budget).toMatchObject({ budgetExhausted: true, reason: "global_search_limit", scope: "global" });
  });

  it("ignora o limite de páginas da categoria e segue nextUrl até ao fim", async () => {
    const budget = createOlxExecutionBudget({ maxSearchPagesPerCategory: 1 }, Date.now());
    const { result, calls } = await run([
      page(definition.searchUrl, "https://www.olx.pt/imoveis/apartamentos/?page=2", [{ externalId: "IDJ1" }]),
      page("https://www.olx.pt/imoveis/apartamentos/?page=2", "https://www.olx.pt/imoveis/apartamentos/?page=3", [{ externalId: "IDJ2" }]),
      page("https://www.olx.pt/imoveis/apartamentos/?page=3", null, [{ externalId: "IDJ3" }])
    ], { budget });

    expect(calls.map((call) => call.url)).toEqual([
      definition.searchUrl,
      "https://www.olx.pt/imoveis/apartamentos/?page=2",
      "https://www.olx.pt/imoveis/apartamentos/?page=3"
    ]);
    expect(result.listings.map((listing) => listing.externalId)).toEqual(["IDJ1", "IDJ2", "IDJ3"]);
    expect(result.metrics.paginationStoppedReason).toBe("no_next_url");
    expect(result.budget).toBeNull();
    expect(budget.exhausted).toBe(false);
  });

  it("para antes da primeira request quando o deadline já expirou", async () => {
    const budget = createOlxExecutionBudget({ timeBudgetMs: 1 }, 0);
    const { result, calls } = await run([page(definition.searchUrl, null)], { budget });

    expect(calls).toHaveLength(0);
    expect(result.listings).toEqual([]);
    expect(result.budget).toMatchObject({ budgetExhausted: true, reason: "deadline", scope: "global" });
  });
});