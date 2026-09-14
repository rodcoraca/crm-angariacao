import { buildIdealistaSearchUrls } from "./IdealistaSearchBuilder.js";

describe("IdealistaSearchBuilder", () => {
  it("resolves Porto and Vila Nova de Gaia without falling back to national search", () => {
    const urls = buildIdealistaSearchUrls({
      districts: ["Porto", "Vila Nova de Gaia", "Lisboa"],
      includePrivateOwners: true,
      includeProfessionalOwners: true
    });

    expect(urls).toEqual(expect.arrayContaining([
      "https://www.idealista.pt/comprar-casas/porto-distrito/",
      "https://www.idealista.pt/comprar-casas/vila-nova-de-gaia/",
      "https://www.idealista.pt/comprar-casas/lisboa-distrito/",
      "https://www.idealista.pt/comprar-garagens/porto-distrito/",
      "https://www.idealista.pt/comprar-escritorios/vila-nova-de-gaia/",
      "https://www.idealista.pt/comprar-predios/lisboa-distrito/"
    ]));

    expect(urls).not.toContain("https://www.idealista.pt/comprar-casas/");
    expect(urls).not.toContain("https://www.idealista.pt/comprar-casas/porto/");
  });

  it("respects owner filters and avoids invalid/external fallback", () => {
    const privateOnly = buildIdealistaSearchUrls({
      districts: ["Porto"],
      includePrivateOwners: true,
      includeProfessionalOwners: false
    });

    const professionalOnly = buildIdealistaSearchUrls({
      districts: ["Porto"],
      includePrivateOwners: false,
      includeProfessionalOwners: true
    });

    expect(privateOnly).toContain("https://www.idealista.pt/comprar-casas/porto-distrito/");
    expect(professionalOnly).toContain("https://www.idealista.pt/comprar-casas/porto-distrito/");
    expect(buildIdealistaSearchUrls({
      districts: [],
      includePrivateOwners: true,
      includeProfessionalOwners: true
    })).toEqual([]);
  });
});
