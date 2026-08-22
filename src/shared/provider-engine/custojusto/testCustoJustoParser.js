import { parseCustoJustoSearchPage } from "./parsers.js";

const url =
  "https://www.custojusto.pt/porto/imobiliario/apartamentos-venda";

const response = await fetch(url);

console.log("STATUS:", response.status);

const html = await response.text();

console.log("HTML LENGTH:", html.length);

const result = parseCustoJustoSearchPage(html);

console.log("LISTINGS:", result.listings.length);
console.log("NEXT URL:", result.nextUrl);

console.log("\nPRIMEIRO ANÚNCIO:");
console.dir(result.listings[0], { depth: null });

console.log("\nÚLTIMO ANÚNCIO:");
console.dir(
  result.listings[result.listings.length - 1],
  { depth: null }
);

console.log("\nCOBERTURA DOS CAMPOS:");

const fields = [
  "externalId",
  "title",
  "shortDescription",
  "price",
  "url",
  "ownerName",
  "isPrivateOwner",
  "createdAtFirst",
  "district",
  "concelho",
  "freguesia",
  "area",
  "rooms",
  "imageUrl",
  "source"
];

for (const field of fields) {
  const count = result.listings.filter(
    (listing) =>
      listing[field] !== null &&
      listing[field] !== undefined &&
      listing[field] !== ""
  ).length;

  console.log(
    `${field}: ${count}/${result.listings.length}`
  );
}