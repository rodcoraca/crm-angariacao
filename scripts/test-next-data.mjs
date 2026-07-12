const response =
  await fetch(
    "https://www.imovirtual.com/pt/resultados/comprar/porto?page=1"
  );

const html =
  await response.text();

const match =
  html.match(
    /<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );

const nextData =
  JSON.parse(match[1]);

const items =
  nextData?.props?.pageProps?.data?.searchAds?.items;

console.log(
  "Listings:",
  items.length
);

console.log(
  items[0]
);