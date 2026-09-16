import {
  collectOlxPaginatedListings,
  collectOlxRoundRobinPaginatedListings,
  filterOlxListingsByDistrict,
  normalizeOlxListing
} from "./providerAdapter";
import { createOlxExecutionBudget } from "./executionBudget";
import { olxP1Fixture } from "./testFixtures";

function detailHtml(location, district) {
  return `<ol data-testid="breadcrumbs"><li data-testid="breadcrumb-item"><a href="/imoveis/apartamento-casa-a-venda/apartamentos-venda/${district.toLowerCase()}/">Vende-se - ${district}</a></li><li data-testid="breadcrumb-item"><a href="/imoveis/apartamento-casa-a-venda/apartamentos-venda/local/">Vende-se - ${location}</a></li></ol><img alt="Location"/><p data-nx-name="P2">${location}</p><p data-nx-name="P3">${district}</p>`;
}

function roundRobinSearchHtml(category, pageNumber, includeListing = false, lastPage = 2) {
  const listing = includeListing
    ? `<div data-testid="l-card"><a data-testid="card-title-link" aria-label="${category}-${pageNumber}" href="/d/anuncio/${category}-${pageNumber}-IDJ${category}${pageNumber}.html"><h4>${category}-${pageNumber}</h4></a><p data-testid="location-date">Porto - hoje</p></div>`
    : "";
  const next = pageNumber < lastPage
    ? `<a data-testid="pagination-forward" href="/imoveis/${category}/?page=${pageNumber + 1}">Seguinte</a>`
    : "";
  return `${listing}${next}`;
}

describe("OLX provider adapter", () => {
  it("normalizes observed card data without inventing owner type", () => {
    const result = normalizeOlxListing({
      externalId: "IDJ123",
      title: "Apartamento",
      price: "125.000,50 €",
      location: "Lisboa",
      publishedAt: "hoje às 09:30",
      url: "https://www.olx.pt/d/anuncio/apartamento-IDJ123.html"
    }, "2026-09-10T12:00:00.000Z");

    expect(result).toMatchObject({
      externalId: "IDJ123",
      price: 125000.5,
      location: "Lisboa",
      city: null,
      district: null,
      isPrivateOwner: null,
      createdAtFirst: null,
      publishedAt: "hoje às 09:30",
      source: "olx"
    });
  });

  it("keeps listings without an original publication date", () => {
    expect(normalizeOlxListing({
      externalId: "IDJ123",
      url: "https://www.olx.pt/d/anuncio/apartamento-IDJ123.html",
      publishedAt: "há 3 dias"
    })).toMatchObject({ createdAtFirst: null, publishedAt: "há 3 dias" });
  });

  it("keeps the promotion source as metadata without changing the date value", () => {
    const result = normalizeOlxListing({
      externalId: "IDJ123",
      url: "https://www.olx.pt/d/anuncio/apartamento-IDJ123.html",
      publishedAt: "hoje às 09:30",
      publishedAtSource: "promotion"
    });

    expect(result.publishedAt).toBe("hoje às 09:30");
    expect(result.publishedAtSource).toBe("promotion");
    expect(result.rawData.publishedAtSource).toBe("promotion");
  });

  it("filters only explicit districts and never treats location as a district", () => {
    const listings = [
      { externalId: "IDJporto", district: "Porto", location: "Paranhos" },
      { externalId: "IDJlisboa", district: "Lisboa", location: "Lisboa" },
      { externalId: "IDJambiguous", location: "Porto" },
      { externalId: "IDJparanhos", location: "Paranhos" }
    ];

    expect(filterOlxListingsByDistrict(listings, ["Porto"]).map((listing) => listing.externalId))
      .toEqual(["IDJporto"]);
    expect(filterOlxListingsByDistrict(listings, [])).toEqual(listings);
  });

  it("collects OLX listings without DOMParser", async () => {
    const previousDomParser = globalThis.DOMParser;
    try {
      globalThis.DOMParser = undefined;
      const result = await collectOlxPaginatedListings({
        searchUrl: "https://www.olx.pt/imoveis/apartamentos/",
        maxPages: 1,
        maxRequests: 1,
        delayBetweenRequestsMs: 0,
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          url: "https://www.olx.pt/imoveis/apartamentos/",
          text: async () => olxP1Fixture
        })
      });

      expect(result.listings).toHaveLength(37);
      expect(result.listings[0]).toMatchObject({ externalId: "IDJfixture1", source: "olx" });
    } finally {
      globalThis.DOMParser = previousDomParser;
    }
  });

  it("enriches each listing once before applying the district filter", async () => {
    const searchHtml = '<div data-testid="l-card"><a data-testid="card-title-link" aria-label="A" href="/d/anuncio/a-IDJone.html"><h4>A</h4></a><p data-testid="ad-price">100 €</p><p data-testid="location-date">Paranhos - hoje às 09:00</p></div><div data-testid="l-card"><a data-testid="card-title-link" aria-label="B" href="/d/anuncio/b-IDJtwo.html"><h4>B</h4></a><p data-testid="ad-price">200 €</p><p data-testid="location-date">Cacém - hoje às 09:01</p></div>';
    const requestedUrls = [];
    const result = await collectOlxPaginatedListings({
      searchUrl: "https://www.olx.pt/imoveis/apartamentos/",
      maxPages: 1,
      maxRequests: 1,
      districts: ["Porto"],
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("a-IDJone")) return { ok: true, status: 200, url, text: async () => detailHtml("Paranhos", "Porto") };
        if (url.includes("b-IDJtwo")) return { ok: true, status: 200, url, text: async () => detailHtml("Cacém", "Lisboa") };
        return { ok: true, status: 200, url, text: async () => searchHtml };
      }
    });

    expect(requestedUrls).toEqual([
      "https://www.olx.pt/imoveis/apartamentos/",
      "https://www.olx.pt/d/anuncio/a-IDJone.html",
      "https://www.olx.pt/d/anuncio/b-IDJtwo.html"
    ]);
    expect(result.metrics).toMatchObject({ detailRequests: 2, detailFailures: 0 });
    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]).toMatchObject({ location: "Paranhos", district: "Porto" });
  });

  it("does not query provider_leads or return existing listings", async () => {
    const searchHtml = '<div data-testid="l-card"><a data-testid="card-title-link" aria-label="Existing" href="/d/anuncio/existing-IDJexisting.html"><h4>Existing</h4></a><p data-testid="location-date">Porto - hoje</p></div><div data-testid="l-card"><a data-testid="card-title-link" aria-label="New" href="/d/anuncio/new-IDJnew.html"><h4>New</h4></a><p data-testid="location-date">Porto - hoje</p></div>';
    const requestedUrls = [];
    const supabaseClient = { from: jest.fn() };
    const result = await collectOlxPaginatedListings({
      searchUrl: "https://www.olx.pt/imoveis/apartamentos/",
      maxPages: 1,
      supabaseClient,
      maxRequests: 1,
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("new-IDJnew")) {
          return { ok: true, status: 200, url, text: async () => detailHtml("Porto", "Porto") };
        }
        return { ok: true, status: 200, url, text: async () => searchHtml };
      }
    });

    expect(supabaseClient.from).not.toHaveBeenCalled();
    expect(requestedUrls).toEqual([
      "https://www.olx.pt/imoveis/apartamentos/",
      "https://www.olx.pt/d/anuncio/existing-IDJexisting.html",
      "https://www.olx.pt/d/anuncio/new-IDJnew.html"
    ]);
    expect(result.listings.map((listing) => listing.externalId)).toEqual(["IDJexisting", "IDJnew"]);
    expect(result).not.toHaveProperty("existingListings");
  });

  it("continues with the basic listing when a detail request fails", async () => {
    const searchHtml = '<div data-testid="l-card"><a data-testid="card-title-link" aria-label="A" href="/d/anuncio/a-IDJone.html"><h4>A</h4></a><p data-testid="ad-price">100 €</p><p data-testid="location-date">Paranhos - hoje</p></div>';
    let calls = 0;
    const result = await collectOlxPaginatedListings({
      searchUrl: "https://www.olx.pt/imoveis/apartamentos/",
      maxPages: 1,
      maxRequests: 1,
      fetchImpl: async (url) => {
        calls += 1;
        if (calls === 2) return { ok: false, status: 429, url, text: async () => "" };
        return { ok: true, status: 200, url, text: async () => searchHtml };
      }
    });

    expect(result.metrics).toMatchObject({ detailRequests: 1, detailFailures: 1 });
    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]).toMatchObject({ location: "Paranhos", district: null });
  });

  it("preserves the Search listing when the detail budget ends", async () => {
    const searchHtml = '<div data-testid="l-card"><a data-testid="card-title-link" aria-label="A" href="/d/anuncio/a-IDJone.html"><h4>A</h4></a><p data-testid="location-date">Porto - hoje</p></div><div data-testid="l-card"><a data-testid="card-title-link" aria-label="B" href="/d/anuncio/b-IDJtwo.html"><h4>B</h4></a><p data-testid="location-date">Porto - hoje</p></div>';
    const budget = createOlxExecutionBudget({ maxDetailRequests: 1, maxDetailRequestsPerCategory: 4 }, Date.now());
    const result = await collectOlxRoundRobinPaginatedListings({
      searchUrls: ["https://www.olx.pt/imoveis/apartamentos/"],
      maxPages: 1,
      delayBetweenRequestsMs: 0,
      budget,
      fetchImpl: async (url) => {
        if (url.includes("/d/anuncio/")) return { ok: true, status: 200, url, text: async () => "<html>detail</html>" };
        return { ok: true, status: 200, url, text: async () => searchHtml };
      }
    });

    expect(result.categories[0].metrics.detailRequests).toBe(1);
    expect(result.categories[0].listings).toHaveLength(2);
    expect(result.categories[0].listings.map((listing) => listing.externalId)).toEqual(["IDJone", "IDJtwo"]);
    expect(result.budget).toMatchObject({ budgetExhausted: true, reason: "global_detail_limit", scope: "global" });
  });

  it("preserves Search listings when the global detail budget ends", async () => {
    const searchHtml = '<div data-testid="l-card"><a data-testid="card-title-link" aria-label="A" href="/d/anuncio/a-IDJone.html"><h4>A</h4></a><p data-testid="ad-price">100 €</p><p data-testid="location-date">Paranhos - hoje às 09:00</p></div><div data-testid="l-card"><a data-testid="card-title-link" aria-label="B" href="/d/anuncio/b-IDJtwo.html"><h4>B</h4></a><p data-testid="ad-price">200 €</p><p data-testid="location-date">Cacém - hoje às 09:01</p></div>';
    const budget = createOlxExecutionBudget({ maxDetailRequests: 1, maxDetailRequestsPerCategory: 4 }, Date.now());
    const requestedUrls = [];
    const result = await collectOlxPaginatedListings({
      searchUrl: "https://www.olx.pt/imoveis/apartamentos/",
      maxPages: 1,
      maxRequests: 1,
      budget,
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("a-IDJone")) return { ok: true, status: 200, url, text: async () => detailHtml("Paranhos", "Porto") };
        return { ok: true, status: 200, url, text: async () => searchHtml };
      }
    });

    expect(requestedUrls).toHaveLength(2);
    expect(result.metrics.detailRequests).toBe(1);
    expect(result.listings).toHaveLength(2);
    expect(result.listings[0].district).toBe("Porto");
    expect(result.listings[1].externalId).toBe("IDJtwo");
    expect(result.budget).toMatchObject({ budgetExhausted: true, reason: "global_detail_limit", scope: "global" });
  });

  it("keeps every acquired category eligible after the global detail budget ends", async () => {
    const searchUrls = ["a", "b"].map((category) => `https://www.olx.pt/imoveis/${category}/`);
    const requestedUrls = [];
    const budget = createOlxExecutionBudget({ maxDetailRequests: 1, maxDetailRequestsPerCategory: 4 }, Date.now());
    const result = await collectOlxRoundRobinPaginatedListings({
      searchUrls,
      maxPages: 1,
      delayBetweenRequestsMs: 0,
      budget,
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/d/anuncio/")) {
          return { ok: true, status: 200, url, text: async () => detailHtml("Porto", "Porto") };
        }
        const category = url.match(/\/imoveis\/([^/]+)/)[1];
        const searchHtml = `<div data-testid="l-card"><a data-testid="card-title-link" aria-label="${category}" href="/d/anuncio/${category}-IDJ${category}.html"><h4>${category}</h4></a><p data-testid="location-date">Porto - hoje</p></div>`;
        return { ok: true, status: 200, url, text: async () => searchHtml };
      }
    });

    expect(requestedUrls).toEqual([
      searchUrls[0],
      searchUrls[1],
      "https://www.olx.pt/d/anuncio/a-IDJa.html"
    ]);
    expect(result.categories).toHaveLength(2);
    expect(result.categories.map((category) => category.listings.map((listing) => listing.externalId)))
      .toEqual([["IDJa"], ["IDJb"]]);
    expect(result.budget).toMatchObject({ budgetExhausted: true, reason: "global_detail_limit", scope: "global" });
  });

  it("stops details at the category limit and preserves the category result", async () => {
    const searchHtml = '<div data-testid="l-card"><a data-testid="card-title-link" aria-label="A" href="/d/anuncio/a-IDJone.html"><h4>A</h4></a><p data-testid="location-date">Paranhos - hoje</p></div><div data-testid="l-card"><a data-testid="card-title-link" aria-label="B" href="/d/anuncio/b-IDJtwo.html"><h4>B</h4></a><p data-testid="location-date">Matosinhos - hoje</p></div>';
    const budget = createOlxExecutionBudget({ maxDetailRequests: 10, maxDetailRequestsPerCategory: 1 }, Date.now());
    const result = await collectOlxPaginatedListings({
      searchUrl: "https://www.olx.pt/imoveis/apartamentos/",
      maxPages: 1,
      maxRequests: 1,
      budget,
      fetchImpl: async (url) => {
        if (url.includes("/d/anuncio/")) return { ok: true, status: 200, url, text: async () => detailHtml("Paranhos", "Porto") };
        return { ok: true, status: 200, url, text: async () => searchHtml };
      }
    });

    expect(result.metrics.detailRequests).toBe(1);
    expect(result.budget).toMatchObject({ budgetExhausted: true, reason: "category_detail_limit", scope: "category" });
    expect(result.listings).toHaveLength(2);
    expect(budget.exhausted).toBe(false);
  });

  it("processes all category page 1 requests before page 2 requests", async () => {
    const searchUrls = ["a", "b", "c"].map((category) => `https://www.olx.pt/imoveis/${category}/`);
    const calls = [];
    const result = await collectOlxRoundRobinPaginatedListings({
      searchUrls,
      maxPages: 2,
      delayBetweenRequestsMs: 0,
      collectionSession: { budget: createOlxExecutionBudget({ maxSearchPagesPerCategory: 2, maxSearchRequests: 22 }) },
      resolveExistingListings: async (externalIds) => new Map(externalIds.map((id) => [id, `lead-${id}`])),
      fetchImpl: async (url) => {
        calls.push(url);
        const match = url.match(/\/imoveis\/([^/]+)\/\?page=(\d+)/);
        const category = match?.[1] || url.match(/\/imoveis\/([^/]+)\//)[1];
        const pageNumber = Number(match?.[2] || 1);
        return { ok: true, status: 200, url, text: async () => roundRobinSearchHtml(category, pageNumber, true) };
      }
    });

    expect(calls.map((url) => url.replace(/\?page=\d+$/, ""))).toEqual([
      searchUrls[0], searchUrls[1], searchUrls[2],
      searchUrls[0], searchUrls[1], searchUrls[2]
    ]);
    expect(result.categories.every((category) => category.pagesFetched === 2)).toBe(true);
    expect(calls.every((url) => !url.includes("/d/anuncio/"))).toBe(true);
  });

  it("follows each category nextUrl through page 3 without the category page limit", async () => {
    const searchUrls = ["a", "b"].map((category) => `https://www.olx.pt/imoveis/${category}/`);
    const calls = [];
    const result = await collectOlxRoundRobinPaginatedListings({
      searchUrls,
      delayBetweenRequestsMs: 0,
      collectionSession: { budget: createOlxExecutionBudget({ maxSearchPagesPerCategory: 2, maxSearchRequests: 10 }) },
      resolveExistingListings: async (externalIds) => new Map(externalIds.map((id) => [id, `lead-${id}`])),
      fetchImpl: async (url) => {
        calls.push(url);
        const category = url.match(/\/imoveis\/([^/]+)/)[1];
        const pageNumber = Number(url.match(/page=(\d+)/)?.[1] || 1);
        return { ok: true, status: 200, url, text: async () => roundRobinSearchHtml(category, pageNumber, true, 3) };
      }
    });

    expect(calls.map((url) => url.replace(/\?page=\d+$/, ""))).toEqual([
      searchUrls[0], searchUrls[1],
      searchUrls[0], searchUrls[1],
      searchUrls[0], searchUrls[1]
    ]);
    expect(result.categories.map((category) => category.pagesFetched)).toEqual([3, 3]);
    expect(result.listings).toHaveLength(6);
  });

  it("keeps independent nextUrls and removes a finished category from later rounds", async () => {
    const searchUrls = ["a", "b", "c"].map((category) => `https://www.olx.pt/imoveis/${category}/`);
    const calls = [];
    await collectOlxRoundRobinPaginatedListings({
      searchUrls,
      maxPages: 2,
      delayBetweenRequestsMs: 0,
      collectionSession: { budget: createOlxExecutionBudget({ maxSearchPagesPerCategory: 2, maxSearchRequests: 22 }) },
      fetchImpl: async (url) => {
        calls.push(url);
        const category = url.match(/\/imoveis\/([^/]+)/)[1];
        const pageNumber = url.includes("?page=2") ? 2 : 1;
        const next = category === "a" ? 2 : pageNumber;
        return {
          ok: true,
          status: 200,
          url,
          text: async () => roundRobinSearchHtml(category, next, false)
        };
      }
    });

    expect(calls.map((url) => url.replace(/\?page=\d+$/, ""))).toEqual([
      searchUrls[0], searchUrls[1], searchUrls[2], searchUrls[1], searchUrls[2]
    ]);
  });

  it("does not let an error in one category block the next round", async () => {
    const searchUrls = ["a", "b", "c"].map((category) => `https://www.olx.pt/imoveis/${category}/`);
    const calls = [];
    await collectOlxRoundRobinPaginatedListings({
      searchUrls,
      maxPages: 2,
      delayBetweenRequestsMs: 0,
      collectionSession: { budget: createOlxExecutionBudget({ maxSearchPagesPerCategory: 2, maxSearchRequests: 22 }) },
      fetchImpl: async (url) => {
        calls.push(url);
        if (url.includes("/imoveis/b/") && !url.includes("?page=2")) {
          return { ok: false, status: 500, url, text: async () => "" };
        }
        const category = url.match(/\/imoveis\/([^/]+)/)[1];
        const pageNumber = url.includes("?page=2") ? 2 : 1;
        return { ok: true, status: 200, url, text: async () => roundRobinSearchHtml(category, pageNumber, false) };
      }
    });

    expect(calls.map((url) => url.replace(/\?page=\d+$/, ""))).toEqual([
      searchUrls[0], searchUrls[1], searchUrls[2], searchUrls[0], searchUrls[2]
    ]);
  });

  it.each([
    [10, 22, 20, 2],
    [20, 22, 22, 2],
    [30, 22, 22, 1]
  ])("respects round-robin budget for %i categories and %i requests", async (categoryCount, maxSearchRequests, expectedRequests, expectedMaxPages) => {
    const searchUrls = Array.from({ length: categoryCount }, (_, index) => `https://www.olx.pt/imoveis/c${index}/`);
    const calls = [];
    const result = await collectOlxRoundRobinPaginatedListings({
      searchUrls,
      maxPages: 2,
      delayBetweenRequestsMs: 0,
      collectionSession: { budget: createOlxExecutionBudget({ maxSearchPagesPerCategory: 2, maxSearchRequests }) },
      fetchImpl: async (url) => {
        calls.push(url);
        const category = url.match(/\/imoveis\/([^/]+)/)[1];
        const pageNumber = url.includes("?page=2") ? 2 : 1;
        return { ok: true, status: 200, url, text: async () => roundRobinSearchHtml(category, pageNumber, false) };
      }
    });

    expect(calls).toHaveLength(expectedRequests);
    expect(Math.max(...result.categories.map((category) => category.pagesFetched))).toBe(expectedMaxPages);
  });

  it("does one existing lookup batch and skips detail for existing listings", async () => {
    const searchUrl = "https://www.olx.pt/imoveis/a/";
    const requestedUrls = [];
    const lookupCalls = [];
    const result = await collectOlxRoundRobinPaginatedListings({
      searchUrls: [searchUrl],
      maxPages: 1,
      delayBetweenRequestsMs: 0,
      collectionSession: { budget: createOlxExecutionBudget({ maxSearchPagesPerCategory: 2, maxSearchRequests: 22 }) },
      resolveExistingListings: async (externalIds) => {
        lookupCalls.push(externalIds);
        return new Map([["IDJexisting", "provider-lead-existing"]]);
      },
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/d/anuncio/")) {
          return { ok: true, status: 200, url, text: async () => detailHtml("Porto", "Porto") };
        }
        return {
          ok: true,
          status: 200,
          url,
          text: async () => '<div data-testid="l-card"><a data-testid="card-title-link" aria-label="Existing" href="/d/anuncio/existing-IDJexisting.html"><h4>Existing</h4></a><p data-testid="location-date">Porto - hoje</p></div><div data-testid="l-card"><a data-testid="card-title-link" aria-label="New" href="/d/anuncio/new-IDJnew.html"><h4>New</h4></a><p data-testid="location-date">Porto - hoje</p></div>'
        };
      }
    });

    expect(lookupCalls).toEqual([["IDJexisting", "IDJnew"]]);
    expect(requestedUrls).toEqual([searchUrl, "https://www.olx.pt/d/anuncio/new-IDJnew.html"]);
    expect(result.categories[0].listings).toEqual(expect.arrayContaining([
      expect.objectContaining({ externalId: "IDJexisting", existingProviderLeadId: "provider-lead-existing" }),
      expect.objectContaining({ externalId: "IDJnew" })
    ]));
    expect(result.categories[0].metrics.detailRequests).toBe(1);
  });
});
