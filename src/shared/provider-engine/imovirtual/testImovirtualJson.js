const url =
  "https://www.imovirtual.com/pt/resultados/comprar/apartamento/porto";

const response = await fetch(url, {
  headers: {
    Accept: "text/html,application/xhtml+xml",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
  }
});

console.log("STATUS:", response.status);
console.log("CONTENT-TYPE:", response.headers.get("content-type"));

const html = await response.text();

console.log("HTML LENGTH:", html.length);

const match = html.match(
  /<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
);

if (!match) {
  throw new Error("__NEXT_DATA__ não encontrado.");
}

const nextData = JSON.parse(match[1]);

const items =
  nextData?.props?.pageProps?.data?.searchAds?.items;

console.log("ITEMS:", Array.isArray(items) ? items.length : 0);

if (!Array.isArray(items) || items.length === 0) {
  console.dir(
    nextData?.props?.pageProps?.data,
    { depth: 3 }
  );
  throw new Error("searchAds.items não encontrado.");
}

console.log("\nPRIMEIRO ITEM RAW:");
console.dir(items[0], { depth: null });

console.log("\nCAMPOS DE LOCALIZAÇÃO:");

for (const item of items.slice(0, 10)) {
  console.log({
    id: item.id,
    title: item.title,
    city: item.location?.address?.city?.name ?? null,
    district: item.location?.address?.province?.name ?? null,
    county: item.location?.address?.county?.name ?? null,
    municipality: item.location?.address?.municipality?.name ?? null,
    parish: item.location?.address?.parish?.name ?? null,
    rooms: item.roomsNumber ?? null,
    area: item.areaInSquareMeters ?? null,
    owner: item.advertOwner?.name ?? null,
    isPrivateOwner: item.isPrivateOwner ?? null
  });
}

console.log("\nCAMPOS DISPONÍVEIS EM location.address:");

console.log(
  Object.keys(
    items[0]?.location?.address || {}
  )
);

console.log("\nCAMPOS DISPONÍVEIS EM advertOwner:");

console.log(
  Object.keys(
    items[0]?.advertOwner || {}
  )
);