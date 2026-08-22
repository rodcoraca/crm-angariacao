import { buildCustoJustoSearchUrls } from "./CustoJustoSearchBuilder.js";

console.log(
  buildCustoJustoSearchUrls({
    districts: ["Porto"],
    includePrivateOwners: true,
    includeProfessionalOwners: true
  })
);