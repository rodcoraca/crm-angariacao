export async function fetchImovirtualSearchPage({
  district,
  municipality,
  propertyType,
  page,
  baseUrl = "https://www.imovirtual.com",
  fetchImpl = globalThis.fetch
} = {}) {
  if (!district || !Number.isInteger(page) || page < 1) {
    throw new Error("district e page (inteiro >= 1) são obrigatórios.");
  }

  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch API indisponível para obter a página de pesquisa.");
  }

  const pathSegments = ["pt", "resultados", "comprar"];
  if (propertyType) pathSegments.push(propertyType);
  pathSegments.push(district);
  if (municipality) pathSegments.push(municipality);

  const searchUrl = new URL(
    `/${pathSegments.map((segment) => encodeURIComponent(segment)).join("/")}`,
    baseUrl
  );
  searchUrl.searchParams.set("page", String(page));

  const response = await fetchImpl(searchUrl.toString());
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