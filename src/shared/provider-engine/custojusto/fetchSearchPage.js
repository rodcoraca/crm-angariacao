/**
 * CustoJusto fetchSearchPage
 *
 * Responsabilidade:
 * - Fazer GET de uma URL de pesquisa do CustoJusto.
 * - Validar a resposta HTTP.
 * - Devolver o HTML bruto para o parser.
 *
 * NÃO é responsabilidade deste módulo:
 * - fazer parsing;
 * - paginação;
 * - persistência;
 * - Supabase;
 * - ProviderSync;
 */

export async function fetchCustoJustoSearchPage(url, options = {}) {
  if (!url) {
    throw new Error("CustoJusto search URL is required.");
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      ...(options.headers || {})
    },
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(
      `CustoJusto request failed: HTTP ${response.status} ${response.statusText}`
    );
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("text/html")) {
    throw new Error(
      `CustoJusto response is not HTML: ${contentType || "unknown content-type"}`
    );
  }

  const html = await response.text();

  if (!html.trim()) {
    throw new Error("CustoJusto returned an empty HTML response.");
  }

  return {
    status: response.status,
    contentType,
    url: response.url,
    html
  };
}