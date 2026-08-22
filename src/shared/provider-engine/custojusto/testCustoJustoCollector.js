import { collectCustoJustoPaginatedListings } from "./collectPaginatedListings.js";

const startUrl =
  "https://www.custojusto.pt/porto/imobiliario/apartamentos-venda";

const result = await collectCustoJustoPaginatedListings(startUrl, {
  maxPages: 2
});

console.log("PÁGINAS:", result.pagesFetched);
console.log("LISTINGS:", result.listings.length);
console.log("NEXT URL:", result.nextUrl);

const ids = result.listings.map(
  (listing) => listing.externalId
);

const uniqueIds = new Set(ids);

console.log("IDS ÚNICOS:", uniqueIds.size);
console.log("DUPLICADOS:", ids.length - uniqueIds.size);

console.log("\nPRIMEIRO:", result.listings[0]);
console.log(
  "\nLISTING 41:",
  result.listings[40]
);