import { buildOlxSearchDefinitions } from "./searchDefinitions";

const category = (url, name = "Categoria") => ({ name, url, slug: "nao-usado-pelo-builder" });

describe("OLX Search Definition Builder v0.1", () => {
  it("cria uma definição por categoria válida", () => {
    const result = buildOlxSearchDefinitions([
      category("https://www.olx.pt/imoveis/apartamentos/", "Apartamentos"),
      category("https://www.olx.pt/imoveis/moradias/", "Moradias")
    ]);
    expect(result.definitions).toEqual([
      { provider: "olx", categoryName: "Apartamentos", categoryUrl: "https://www.olx.pt/imoveis/apartamentos/", searchUrl: "https://www.olx.pt/imoveis/apartamentos/", type: "category" },
      { provider: "olx", categoryName: "Moradias", categoryUrl: "https://www.olx.pt/imoveis/moradias/", searchUrl: "https://www.olx.pt/imoveis/moradias/", type: "category" }
    ]);
    expect(result.metrics).toMatchObject({ categoriesReceived: 2, definitionsCreated: 2 });
  });

  it("preserva a URL da categoria e não inventa um slug ou uma pesquisa", () => {
    const input = category("https://www.olx.pt/imoveis/casas-moradias-para-arrendar-vender/", "Moradias - Casas");
    const result = buildOlxSearchDefinitions([input]);
    expect(result.definitions[0].searchUrl).toBe(input.url);
    expect(result.definitions[0].categoryUrl).toBe(input.url);
  });

  it("normaliza query/hash e deduplica URLs equivalentes", () => {
    const result = buildOlxSearchDefinitions([
      category("https://www.olx.pt/imoveis/apartamentos/?page=2#top"),
      category("https://www.olx.pt/imoveis/apartamentos/", "Duplicada")
    ]);
    expect(result.definitions).toHaveLength(1);
    expect(result.definitions[0].searchUrl).toBe("https://www.olx.pt/imoveis/apartamentos/");
    expect(result.metrics.duplicatesRemoved).toBe(1);
  });

  it("ignora URLs externas e Imovirtual", () => {
    const result = buildOlxSearchDefinitions([
      category("https://www.imovirtual.com/pt/anuncio/casa-ID1"),
      category("https://evil.example/imoveis/casa/")
    ]);
    expect(result.definitions).toEqual([]);
    expect(result.metrics.invalidCategoriesIgnored).toBe(2);
  });

  it("ignora URLs fora de /imoveis/", () => {
    const result = buildOlxSearchDefinitions([category("https://www.olx.pt/veiculos/carro/")]);
    expect(result.definitions).toEqual([]);
  });

  it("ignora URLs de anúncios", () => {
    const result = buildOlxSearchDefinitions([category("https://www.olx.pt/d/anuncio/casa-IDJabc.html")]);
    expect(result.definitions).toEqual([]);
  });

  it("ignora categorias sem URL", () => {
    const result = buildOlxSearchDefinitions([{ name: "Sem URL" }, null]);
    expect(result.definitions).toEqual([]);
    expect(result.metrics.invalidCategoriesIgnored).toBe(2);
  });

  it("ignora URLs inválidas", () => {
    const result = buildOlxSearchDefinitions([category("not a url"), category("http://www.olx.pt/imoveis/http/")]);
    expect(result.definitions).toEqual([]);
  });

  it("aceita array vazio sem erro", () => {
    expect(buildOlxSearchDefinitions([])).toEqual({
      definitions: [],
      metrics: { categoriesReceived: 0, definitionsCreated: 0, duplicatesRemoved: 0, invalidCategoriesIgnored: 0 }
    });
  });

  it("não modifica o array nem os objetos recebidos", () => {
    const input = [category("https://www.olx.pt/imoveis/apartamentos/", " Apartamentos ")];
    const snapshot = JSON.parse(JSON.stringify(input));
    buildOlxSearchDefinitions(input);
    expect(input).toEqual(snapshot);
  });
});