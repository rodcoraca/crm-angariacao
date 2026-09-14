function card({ href, title, price, locationDate }) {
  return `<div data-testid="l-card"><a data-testid="card-title-link" aria-label="${title}" href="${href}"><h4>${title}</h4></a><p data-testid="ad-price">${price}</p><p data-testid="location-date">${locationDate}</p></div>`;
}

function buildFixture({ nativeCount, externalCount, invalidCount, nextPage }) {
  const native = Array.from({ length: nativeCount }, (_, index) => card({
    href: `/d/anuncio/apartamento-${index + 1}-IDJfixture${index + 1}.html?search_reason=search`,
    title: `Apartamento OLX ${index + 1}`,
    price: `${100000 + index} €`,
    locationDate: `Lisboa - hoje às 0${index % 10}:00`
  }));
  const invalid = Array.from({ length: invalidCount }, (_, index) => card({
    href: `/d/anuncio/anuncio-sem-id-IDIfixture${index + 1}.html`,
    title: `Anúncio sem ID ${index + 1}`,
    price: "200.000 €",
    locationDate: "Porto - 10 de setembro de 2026"
  }));
  const external = Array.from({ length: externalCount }, (_, index) => card({
    href: `https://www.imovirtual.com/pt/anuncio/externo-${index + 1}-ID1fixture${index + 1}`,
    title: `Externo ${index + 1}`,
    price: "300.000 €",
    locationDate: "Porto - hoje"
  }));
  return `${native.join("")}${invalid.join("")}${external.join("")}<a data-testid="pagination-forward" href="/imoveis/apartamento-casa-a-venda/?page=${nextPage}">Seguinte</a>`;
}

export const olxP1Fixture = buildFixture({ nativeCount: 37, externalCount: 15, invalidCount: 0, nextPage: 2 });
export const olxP2Fixture = buildFixture({ nativeCount: 20, externalCount: 30, invalidCount: 2, nextPage: 3 });