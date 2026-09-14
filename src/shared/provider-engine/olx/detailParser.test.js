import { parseOlxDetailPage } from "./detailParser";

function detail({ location = "Cacém E São Marcos", district = "Lisboa", href = "agualvacacem", jsonLd = false } = {}) {
  const json = jsonLd
    ? `<script type="application/ld+json">${JSON.stringify({ offers: { areaServed: { name: location } } })}</script>`
    : "";
  return `${json}<ol data-testid="breadcrumbs"><li data-testid="breadcrumb-item"><a href="/imoveis/apartamento-casa-a-venda/apartamentos-venda/${district.toLowerCase()}/">Vende-se - ${district}</a></li><li data-testid="breadcrumb-item"><a href="/imoveis/apartamento-casa-a-venda/apartamentos-venda/${href}/">Vende-se - ${location}</a></li></ol><img alt="Location"/><p data-nx-name="P2">${location}</p><p data-nx-name="P3">${district}</p><p data-nx-name="P3">Tipologia: T3</p><p data-nx-name="P3">Área útil: 86,60 m²</p><div data-testid="ad_description"><div>Descrição do anúncio.</div></div><span data-testid="ad-posted-at">Publicado 11 de setembro de 2026</span><a data-testid="user-profile-link" href="/ads/user/demo/">Utilizador Teste</a>`;
}

describe("OLX detail parser", () => {
  it("extrai Cacém/São Marcos e Lisboa pelos breadcrumbs", () => {
    expect(parseOlxDetailPage(detail())).toMatchObject({
      location: "Cacém E São Marcos",
      district: "Lisboa",
      area: 86.6,
      rooms: 3,
      shortDescription: "Descrição do anúncio.",
      ownerName: "Utilizador Teste",
      publishedAt: "11 de setembro de 2026"
    });
  });

  it("remove os metadados do perfil do nome do proprietário", () => {
    const html = detail().replace(
      "Utilizador Teste",
      "Carlos Silva No OLX desde agosto de 2026 Esteve online dia 21 de agosto de 2026"
    );

    expect(parseOlxDetailPage(html).ownerName).toBe("Carlos Silva");
  });

  it("preserva o nome quando não existem metadados do perfil", () => {
    expect(parseOlxDetailPage(detail()).ownerName).toBe("Utilizador Teste");
  });

  it("extrai Ílhavo/São Salvador e Aveiro", () => {
    expect(parseOlxDetailPage(detail({ location: "Ílhavo (São Salvador)", district: "Aveiro", href: "saosalvador-ilhavo" }))).toMatchObject({ location: "Ílhavo (São Salvador)", district: "Aveiro" });
  });

  it("classifica Para o topo como referência de promoção", () => {
    const html = detail().replace("Publicado 11 de setembro de 2026", "Para o topo hoje às 11:41");
    expect(parseOlxDetailPage(html)).toMatchObject({
      publishedAt: "hoje às 11:41",
      publishedAtSource: "promotion"
    });
  });

  it("usa localização visual sem inferir distrito quando faltam breadcrumbs", () => {
    expect(parseOlxDetailPage('<img alt="Location"/><p data-nx-name="P2">Paranhos</p><p data-nx-name="P3">Porto</p>')).toMatchObject({ location: "Paranhos", district: null });
  });

  it("usa JSON-LD apenas como fallback de localização", () => {
    expect(parseOlxDetailPage(detail({ location: "Mafamude", district: "", jsonLd: true }).replace(/<ol[\s\S]*?<\/ol>/, "").replace(/<img[\s\S]*?<\/p>/, ""))).toMatchObject({ location: "Mafamude", district: null });
  });

  it("aceita HTML parcial e não depende de DOMParser/document", () => {
    const previousParser = globalThis.DOMParser;
    const previousDocument = globalThis.document;
    try {
      globalThis.DOMParser = undefined;
      globalThis.document = undefined;
      expect(parseOlxDetailPage("<div>incompleto")).toMatchObject({ location: null, district: null });
    } finally {
      globalThis.DOMParser = previousParser;
      globalThis.document = previousDocument;
    }
  });
});