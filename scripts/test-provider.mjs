import ImovirtualProvider
from "../src/providers/ImovirtualProvider.js";

const provider =
  new ImovirtualProvider({
    enableLogs: true
  });

const result =
  await provider.testConnection({
    district: "porto",
    page: 1
  });

console.log(result);