import { DISTRITOS, LOCALIZACAO_PORTUGAL } from "./localizacao";

describe("LOCALIZACAO_PORTUGAL (CAOP2025)", () => {
  it("expõe distritos continentais e as ilhas usadas pela CAOP para as regiões autónomas", () => {
    expect(DISTRITOS).toEqual(expect.arrayContaining([
      "Aveiro",
      "Lisboa",
      "Porto",
      "Viseu",
      "Ilha da Madeira",
      "Ilha de São Miguel",
      "Ilha Terceira"
    ]));
    expect(DISTRITOS).toHaveLength(29);
  });

  it("mantém uma estrutura não vazia compatível com os dropdowns dependentes", () => {
    expect(DISTRITOS).toEqual(Object.keys(LOCALIZACAO_PORTUGAL).sort());

    DISTRITOS.forEach((distritoOuIlha) => {
      const concelhos = LOCALIZACAO_PORTUGAL[distritoOuIlha];
      expect(Object.keys(concelhos).length).toBeGreaterThan(0);

      Object.values(concelhos).forEach((freguesias) => {
        expect(Array.isArray(freguesias)).toBe(true);
        expect(freguesias.length).toBeGreaterThan(0);
        expect(freguesias.every(Boolean)).toBe(true);
      });
    });
  });

  it("associa corretamente exemplos de municípios continentais", () => {
    expect(LOCALIZACAO_PORTUGAL.Porto.Porto).toEqual(expect.arrayContaining([
      "Bonfim",
      "Campanhã",
      "Paranhos",
      "Ramalde"
    ]));
    expect(LOCALIZACAO_PORTUGAL.Porto["Vila Nova de Gaia"]).toEqual(expect.arrayContaining([
      "Canidelo",
      "Mafamude",
      "Vilar do Paraíso",
      "Santa Marinha",
      "São Pedro da Afurada"
    ]));
    expect(LOCALIZACAO_PORTUGAL.Lisboa.Sintra).toEqual(expect.arrayContaining([
      "União das freguesias de Agualva e Mira-Sintra",
      "Queluz",
      "Rio de Mouro"
    ]));
  });

  it("inclui municípios das regiões autónomas nas ilhas oficiais", () => {
    expect(LOCALIZACAO_PORTUGAL["Ilha de São Miguel"]["Ponta Delgada"]).toEqual(expect.arrayContaining([
      "Fajã de Baixo",
      "Ponta Delgada (São Sebastião)"
    ]));
    expect(LOCALIZACAO_PORTUGAL["Ilha Terceira"]["Angra do Heroísmo"]).toEqual(expect.arrayContaining([
      "Angra (Sé)",
      "São Mateus da Calheta"
    ]));
    expect(LOCALIZACAO_PORTUGAL["Ilha da Madeira"].Funchal).toEqual(expect.arrayContaining([
      "Funchal (São Pedro)",
      "São Martinho"
    ]));
  });

  it("não mantém associações geográficas manifestamente incorretas", () => {
    expect(LOCALIZACAO_PORTUGAL.Coimbra.Viseu).toBeUndefined();
    expect(LOCALIZACAO_PORTUGAL.Porto.Porto).not.toContain("Santa Maria da Feira");
    expect(LOCALIZACAO_PORTUGAL.Viseu.Viseu).not.toContain("Santa Maria da Feira");
    expect(LOCALIZACAO_PORTUGAL.Faro.Lagos).not.toContain("Praia da Marinha");
  });
});
