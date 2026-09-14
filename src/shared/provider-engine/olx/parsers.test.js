import { olxP1Fixture, olxP2Fixture } from "./testFixtures";
import { parseOlxSearchPage } from "./parsers";

describe("OLX parser v0.1", () => {
  it("extrai listings nativos, campos, IDs IDJ e URL absoluta de P1", () => {
    const result = parseOlxSearchPage(olxP1Fixture);
    expect(result.metrics.cardsDetected).toBe(52);
    expect(result.listings).toHaveLength(37);
    expect(result.listings[0]).toEqual({
      externalId: "IDJfixture1",
      title: "Apartamento OLX 1",
      price: "100000 €",
      location: "Lisboa",
      publishedAt: "hoje às 00:00",
      url: "https://www.olx.pt/d/anuncio/apartamento-1-IDJfixture1.html?search_reason=search"
    });
    expect(result.listings.every((listing) => listing.url.includes("www.olx.pt/d/anuncio/"))).toBe(true);
  });

    it("classifica Para o topo como referência de promoção e remove o prefixo da data", () => {
      const html = '<div data-testid="l-card"><a data-testid="card-title-link" href="/d/anuncio/casa-IDJpromotion.html"><h4>Casa</h4></a><p data-testid="ad-price">100 €</p><p data-testid="location-date">Porto - Para o topo a 13 de setembro de 2026</p></div>';
      expect(parseOlxSearchPage(html).listings[0]).toMatchObject({
        publishedAt: "13 de setembro de 2026",
        publishedAtSource: "promotion"
      });
    });

    it("preserva a hora de Para o topo hoje e não inventa origem sem data", () => {
      const promoted = '<div data-testid="l-card"><a data-testid="card-title-link" href="/d/anuncio/casa-IDJtoday.html"><h4>Casa</h4></a><p data-testid="location-date">Porto - Para o topo hoje às 11:41</p></div>';
      const missing = '<div data-testid="l-card"><a data-testid="card-title-link" href="/d/anuncio/casa-IDJmissing.html"><h4>Casa</h4></a><p data-testid="location-date">Porto</p></div>';

      expect(parseOlxSearchPage(promoted).listings[0]).toMatchObject({
        publishedAt: "hoje às 11:41",
        publishedAtSource: "promotion"
      });
      expect(parseOlxSearchPage(missing).listings[0]).toMatchObject({ publishedAt: null });
      expect(parseOlxSearchPage(missing).listings[0].publishedAtSource).toBeUndefined();
    });

  it("extrai nextUrl e reporta cards externos e IDs inválidos em P2", () => {
    const result = parseOlxSearchPage(olxP2Fixture);
    expect(result.metrics.cardsDetected).toBe(52);
    expect(result.listings).toHaveLength(20);
    expect(result.metrics.externalLinksIgnored).toBe(30);
    expect(result.metrics.invalidIds).toBe(2);
    expect(result.nextUrl).toBe("https://www.olx.pt/imoveis/apartamento-casa-a-venda/?page=3");
    expect(result.metrics.nextUrlFound).toBe(true);
  });

  it("deduplica por externalId e rejeita card nativo sem ID válido", () => {
    const duplicate = olxP1Fixture.replace("IDJfixture2", "IDJfixture1");
    const result = parseOlxSearchPage(`${duplicate}<div data-testid="l-card"><a data-testid="card-title-link" href="/d/anuncio/sem-id.html">Sem ID</a><p data-testid="ad-price">1 €</p><p data-testid="location-date">Lisboa - hoje</p></div>`);
    expect(result.metrics.duplicatesRemoved).toBe(1);
    expect(result.metrics.invalidIds).toBe(1);
    expect(result.listings).toHaveLength(36);
  });

  it("trata HTML vazio/inválido e campos ausentes sem fazer requests", () => {
    expect(parseOlxSearchPage("")).toEqual({ listings: [], nextUrl: null, metrics: expect.any(Object) });
    const result = parseOlxSearchPage('<div data-testid="l-card"><a data-testid="card-title-link" aria-label="Só título" href="/d/anuncio/so-titulo-IDJabc.html"><h4>Só título</h4></a></div>');
    expect(result.listings[0]).toMatchObject({ externalId: "IDJabc", title: "Só título", price: null, location: null, publishedAt: null });
  });

  it("não usa fetch, XMLHttpRequest ou qualquer transporte HTTP", () => {
    const previousFetch = global.fetch;
    global.fetch = () => { throw new Error("HTTP não permitido no parser"); };
    expect(() => parseOlxSearchPage(olxP1Fixture)).not.toThrow();
    global.fetch = previousFetch;
  });

  it("funciona sem DOMParser no runtime", () => {
    const previousDomParser = globalThis.DOMParser;
    try {
      globalThis.DOMParser = undefined;
      const result = parseOlxSearchPage(olxP1Fixture);
      expect(result.listings).toHaveLength(37);
      expect(result.listings[0]).toMatchObject({
        externalId: "IDJfixture1",
        title: "Apartamento OLX 1",
        price: "100000 €",
        location: "Lisboa",
        publishedAt: "hoje às 00:00"
      });
    } finally {
      globalThis.DOMParser = previousDomParser;
    }
  });

  it("descodifica entidades HTML nos campos do anúncio", () => {
    const html = '<div data-testid="l-card"><a data-testid="card-title-link" href="/d/anuncio/casa-IDJentity.html" aria-label="Casa &amp; jardim"><h4>Casa</h4></a><p data-testid="ad-price">100&nbsp;000 &quot;€&quot;</p><p data-testid="location-date">Porto &amp; Gaia - hoje</p></div>';
    expect(parseOlxSearchPage(html).listings[0]).toMatchObject({
      title: "Casa & jardim",
      price: "100 000 \"€\"",
      location: "Porto & Gaia",
      publishedAt: "hoje"
    });
  });

  it("tolera HTML parcial sem lançar erro", () => {
    expect(() => parseOlxSearchPage('<div data-testid="l-card"><a data-testid="card-title-link" href="/d/anuncio/casa-IDJpartial.html">Casa')).not.toThrow();
    expect(parseOlxSearchPage('<div data-testid="l-card"><a data-testid="card-title-link" href="/d/anuncio/casa-IDJpartial.html">Casa').listings).toEqual([]);
  });
});