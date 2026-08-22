import { fetchCustoJustoSearchPage } from "./fetchSearchPage.js";
import { parseCustoJustoSearchPage } from "./parsers.js";

const url =
  "https://www.custojusto.pt/porto/imobiliario/apartamentos-venda";

const response = await fetchCustoJustoSearchPage(url);

const result = parseCustoJustoSearchPage(response.html);

console.log("HTTP STATUS:", response.status);
console.log("HTML LENGTH:", response.html.length);
console.log("LISTINGS:", result.listings.length);
console.log("NEXT URL:", result.nextUrl);

console.log("\nPRIMEIRO LISTING:");
console.dir(result.listings[0], { depth: null });

console.log("\nÚLTIMO LISTING:");
console.dir(
  result.listings[result.listings.length - 1],
  { depth: null }
);