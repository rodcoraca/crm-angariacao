export async function fetchImovirtualSearchPage({
  district,
  municipality,
  propertyType,
  searchUrl,
  page,
  baseUrl = "https://www.imovirtual.com",
  fetchImpl = globalThis.fetch
} = {}) {
  if (!Number.isInteger(page) || page < 1) {
    throw new Error("page (inteiro >= 1) é obrigatório.");
  }

  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch API indisponível para obter a página de pesquisa.");
  }

  let resolvedSearchUrl;
  if (searchUrl) {
    resolvedSearchUrl = new URL(String(searchUrl), baseUrl);
  } else {
    if (!district) {
      throw new Error("district é obrigatório quando searchUrl não é fornecido.");
    }

    const pathSegments = ["pt", "resultados", "comprar"];
    if (propertyType) pathSegments.push(propertyType);
    pathSegments.push(district);
    if (municipality) pathSegments.push(municipality);

    resolvedSearchUrl = new URL(
      `/${pathSegments.map((segment) => encodeURIComponent(segment)).join("/")}`,
      baseUrl
    );
  }

  resolvedSearchUrl.searchParams.set("page", String(page));

  const response = await fetchImpl(resolvedSearchUrl.toString());
  if (!response.ok) {
    const error = new Error(`Falha ao obter página de pesquisa do Imovirtual (HTTP ${response.status}).`);
    error.statusCode = response.status;
    throw error;
  }

  const html = await response.text();
  return {
    html,
    fetchedAt: new Date().toISOString(),
    statusCode: response.status
  };
}