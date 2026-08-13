import fs from "node:fs/promises";

import {
  fetchImovirtualSearchPage
} from "../src/shared/provider-engine/imovirtual/fetchSearchPage.js";

import {
  extractNextData,
  extractListings
} from "../src/shared/provider-engine/imovirtual/parsers.js";

const SEARCH_URL =
  "https://www.imovirtual.com/pt/resultados/comprar/apartamento/todo-o-pais";

const START_PAGE = 1;
const PAGES = 5;

async function fetchWithTimeout(url) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    return await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const listings = new Map();

  console.log("");
  console.log("========================================");
  console.log(" GERAÇÃO DO TESTE DE OTIMIZAÇÃO");
  console.log("========================================");
  console.log("");
  console.log(`Páginas: ${START_PAGE} → ${START_PAGE + PAGES - 1}`);
  console.log("");

  for (
    let page = START_PAGE;
    page < START_PAGE + PAGES;
    page++
  ) {
    const result = await fetchImovirtualSearchPage({
      searchUrl: SEARCH_URL,
      page,
      fetchImpl: fetchWithTimeout
    });

    const nextData = extractNextData(result.html);
    const pageListings = extractListings(nextData);

    console.log(
      `Página ${page}: ${pageListings.length} listings`
    );

    for (const listing of pageListings) {
      const externalId = String(
        listing.externalId ?? ""
      ).trim();

      if (!/^\d{8}$/.test(externalId)) {
        console.log(
          `IGNORADO — externalId inválido: ${externalId}`
        );
        continue;
      }

      if (!listings.has(externalId)) {
        listings.set(externalId, externalId);
      }
    }
  }

  const ids = Array.from(listings.values());

  console.log("");
  console.log("========================================");
  console.log(" RESULTADO DA EXTRAÇÃO");
  console.log("========================================");
  console.log("");
  console.log(`IDs únicos válidos: ${ids.length}`);
  console.log("");

  if (ids.length === 0) {
    throw new Error(
      "Nenhum external_id válido foi encontrado."
    );
  }

  const values = ids
    .map((id) => `        ('${id}')`)
    .join(",\n");

  const sql = `SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (
        WHERE pl.provider_active = true
    ) AS active,
    COUNT(*) FILTER (
        WHERE pl.provider_active = false
    ) AS inactive,
    COUNT(*) FILTER (
        WHERE pl.external_id IS NULL
    ) AS not_found
FROM (
    VALUES
${values}
) AS i(external_id)
LEFT JOIN provider_leads pl
    ON pl.external_id = i.external_id
   AND pl.provider = 'imovirtual';`;

  const outputFile =
    "./supabase/test-imovirtual-optimization.sql";

  await fs.writeFile(
    outputFile,
    sql,
    "utf8"
  );

  console.log("SQL criado:");
  console.log(outputFile);
  console.log("");
  console.log("Agora execute esse SQL no Supabase SQL Editor.");
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("========================================");
  console.error(" ERRO");
  console.error("========================================");
  console.error("");
  console.error(error);
  console.error("");
  process.exit(1);
});
