import { buildOlxSearchUrls } from "./OlxSearchBuilder";

describe("OLX Search Builder", () => {
  it("constrói URLs apenas a partir das categorias descobertas", () => {
    expect(buildOlxSearchUrls({
      categories: [
        { name: "Apartamentos", url: "https://www.olx.pt/imoveis/apartamentos/" },
        { name: "Moradias", url: "https://www.olx.pt/imoveis/moradias/" }
      ]
    })).toEqual([
      "https://www.olx.pt/imoveis/apartamentos/",
      "https://www.olx.pt/imoveis/moradias/"
    ]);
  });

  it("não cria uma URL quando não existem categorias válidas", () => {
    expect(buildOlxSearchUrls({ categories: [] })).toEqual([]);
  });
});
