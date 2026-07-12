const response =
  await fetch(
    "https://www.imovirtual.com/pt/resultados/comprar/porto?page=1"
  );

console.log("STATUS:", response.status);

const html =
  await response.text();

console.log(
  html.substring(0,500)
);

const match =
  html.match(
    /<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );

console.log(
  "__NEXT_DATA__:",
  !!match
);

if (match) {
  const data =
     JSON.parse(match[1]);

  console.log(
     Object.keys(data.props.pageProps)
  );
}

const nextData =
  JSON.parse(match[1]);

const items =
  nextData?.props?.pageProps?.data?.searchAds?.items;

console.log(
  "Listings:",
  items?.length
);

console.log(
  items?.[0]
);