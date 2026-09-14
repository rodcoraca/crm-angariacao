export async function fetchIdealistaSearchPage({
  searchUrl,
  page = 1,
  fetchImpl = globalThis.fetch,
  baseUrl = "https://www.idealista.pt"
} = {}) {
  if (!searchUrl) {
    throw new Error("Idealista search URL is required.");
  }

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("page (inteiro >= 1) é obrigatório.");
  }

  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch API indisponível para obter a página de pesquisa.");
  }

  const url = new URL(String(searchUrl), baseUrl);
  url.searchParams.set("page", String(page));

  const response = await fetchImpl(url.toString(), {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
    },
    redirect: "follow"
  });

  if (!response.ok) {
    const error = new Error(`Falha ao obter página de pesquisa do Idealista (HTTP ${response.status}).`);
    error.statusCode = response.status;
    throw error;
  }

  const html = await response.text();

  if (!html || !String(html).trim()) {
    throw new Error("Idealista returned an empty HTML response.");
  }

  return {
    html,
    fetchedAt: new Date().toISOString(),
    statusCode: response.status,
    finalUrl: response.url,
    url: response.url
  };
}
