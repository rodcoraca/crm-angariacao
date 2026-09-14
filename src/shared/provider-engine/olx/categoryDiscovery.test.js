import { discoverOlxCategories } from "./categoryDiscovery";

const validCategory = (href, name = "Apartamentos") => `<ul data-testid="category-count-links"><li><a href="${href}">${name}<span data-nx-name="Label1">82 940</span></a></li></ul>`;

describe("OLX category discovery v0.1", () => {
  it("extrai categorias do container publicado pelo OLX", () => {
    const result = discoverOlxCategories(`${validCategory("/imoveis/apartamento-casa-a-venda/")}<ul data-testid="location-links"><li><a href="/imoveis/lisboa/">Lisboa</a></li></ul>`);
    expect(result.categories).toEqual([{ name: "Apartamentos", url: "https://www.olx.pt/imoveis/apartamento-casa-a-venda/", slug: "apartamento-casa-a-venda" }]);
    expect(result.metrics).toMatchObject({ linksInspected: 1, categoriesFound: 1 });
  });

  it("deduplica URLs repetidas e ignora query/hash", () => {
    const html = `${validCategory("/imoveis/apartamentos/?page=2#top")} ${validCategory("https://www.olx.pt/imoveis/apartamentos/#other", "Apartamentos duplicados")}`;
    const result = discoverOlxCategories(html);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].url).toBe("https://www.olx.pt/imoveis/apartamentos/");
    expect(result.metrics.duplicatesRemoved).toBe(1);
  });

  it("descobre múltiplas categorias do mesmo container", () => {
    const html = `<ul data-testid="category-count-links">
      <li><a href="/imoveis/apartamentos/">Apartamentos</a></li>
      <li><a href="/imoveis/moradias/">Moradias</a></li>
      <li><a href="/imoveis/terrenos/">Terrenos</a></li>
    </ul>`;
    const result = discoverOlxCategories(html);
    expect(result.categories.map(({ slug }) => slug)).toEqual(["apartamentos", "moradias", "terrenos"]);
    expect(result.metrics).toMatchObject({ linksInspected: 3, categoriesFound: 3 });
  });

  it("ignora externos, Imovirtual, anúncios, root e links fora da taxonomia", () => {
    const html = `<ul data-testid="category-count-links">
      <li><a href="https://www.imovirtual.com/pt/anuncio/casa-ID1">Imovirtual</a></li>
      <li><a href="/d/anuncio/casa-IDJabc.html">Anúncio OLX</a></li>
      <li><a href="/imoveis/">Imóveis</a></li>
      <li><a href="/ajuda/">Ajuda</a></li>
      <li><a href="/imoveis/q-casa/">Pesquisa</a></li>
    </ul>`;
    const result = discoverOlxCategories(html);
    expect(result.categories).toEqual([]);
    expect(result.metrics).toMatchObject({ externalLinksIgnored: 1, invalidLinksIgnored: 4 });
  });

  it("aceita URLs relativas e rejeita protocolo inseguro, host inválido e nome vazio", () => {
    const html = `<ul data-testid="category-count-links">
      <li><a href="/imoveis/moradias/">Moradias</a></li>
      <li><a href="http://www.olx.pt/imoveis/http/">HTTP</a></li>
      <li><a href="https://evil.example/imoveis/evil">Externo</a></li>
      <li><a href="/imoveis/sem-nome/"><span data-nx-name="Label1">12</span></a></li>
    </ul>`;
    const result = discoverOlxCategories(html);
    expect(result.categories).toEqual([{ name: "Moradias", url: "https://www.olx.pt/imoveis/moradias/", slug: "moradias" }]);
    expect(result.metrics).toMatchObject({ externalLinksIgnored: 1, invalidLinksIgnored: 2 });
  });

  it("retorna saída vazia para página sem categorias, HTML vazio ou inválido", () => {
    expect(discoverOlxCategories("")).toEqual({ categories: [], metrics: expect.any(Object) });
    expect(discoverOlxCategories("<html><body><h1>Sem categorias</h1>")).toEqual({ categories: [], metrics: expect.any(Object) });
    expect(discoverOlxCategories(null)).toEqual({ categories: [], metrics: expect.any(Object) });
  });

  it("não depende de DOMParser no runtime", () => {
    const originalDomParser = globalThis.DOMParser;
    try {
      globalThis.DOMParser = undefined;
      const result = discoverOlxCategories(validCategory("/imoveis/apartamentos/"));
      expect(result.categories).toHaveLength(1);
    } finally {
      globalThis.DOMParser = originalDomParser;
    }
  });

  it("tolera HTML parcial ou malformado sem lançar erro", () => {
    expect(() => discoverOlxCategories(
      `<ul data-testid="category-count-links"><li><a href="/imoveis/apartamentos/">Apartamentos`
    )).not.toThrow();
    expect(discoverOlxCategories(
      `<ul data-testid="category-count-links"><li><a href="/imoveis/apartamentos/">Apartamentos`
    ).categories).toEqual([]);
  });
});