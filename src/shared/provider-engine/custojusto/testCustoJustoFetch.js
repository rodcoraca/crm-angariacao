import { fetchCustoJustoSearchPage } from "./fetchSearchPage.js";

const url =
  "https://www.custojusto.pt/porto/imobiliario/apartamentos-venda";

const result = await fetchCustoJustoSearchPage(url);

console.log("STATUS:", result.status);
console.log("CONTENT-TYPE:", result.contentType);
console.log("FINAL URL:", result.url);
console.log("HTML LENGTH:", result.html.length);
console.log("HAS NEXT:", result.html.includes('rel="next"'));
console.log("HAS LIST ITEMS:", result.html.includes('"listItems":['));