const MAX_PAGES = 10;

const IMOVIRTUAL_START_URL =
  "https://www.imovirtual.com/pt/resultados/comprar/apartamento/porto";

const CUSTOJUSTO_START_URL =
  "https://www.custojusto.pt/porto/imobiliario/apartamentos-venda";

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/142.0.0.0 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return {
    url: response.url,
    html: await response.text()
  };
}

function extractNextUrl(html) {
  const match = html.match(
    /<link\b[^>]*\brel=["']next["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i
  );

  return match ? new URL(match[1]).toString() : null;
}

function extractNextData(html) {
  const match = html.match(
    /<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );

  if (!match) {
    throw new Error("__NEXT_DATA__ não encontrado.");
  }

  return JSON.parse(match[1]);
}

function addCount(map, value) {
  const key =
    value === null ||
    value === undefined ||
    value === ""
      ? "(VAZIO)"
      : String(value);

  map.set(key, (map.get(key) || 0) + 1);
}

async function collectImovirtual() {
  let url = IMOVIRTUAL_START_URL;
  const visited = new Set();
  const records = [];

  for (let page = 1; page <= MAX_PAGES && url; page++) {
    if (visited.has(url)) break;
    visited.add(url);

    console.log(`Imovirtual página ${page}: ${url}`);

    const response = await fetchHtml(url);
    const nextData = extractNextData(response.html);

    const items =
      nextData?.props?.pageProps?.data?.searchAds?.items || [];

    for (const item of items) {
      const address = item.location?.address || {};

      records.push({
        id: item.id,
        title: item.title,

        district:
          address?.province?.name ?? null,

        city:
          address?.city?.name ?? null,

        county:
          address?.county?.name ??
          address?.municipality?.name ??
          null,

        parish:
          address?.parish?.name ?? null,

        addressKeys: Object.keys(address)
      });
    }

    url = extractNextUrl(response.html);
  }

  return records;
}

async function collectCustoJusto() {
  let url = CUSTOJUSTO_START_URL;
  const visited = new Set();
  const records = [];

  for (let page = 1; page <= MAX_PAGES && url; page++) {
    if (visited.has(url)) break;
    visited.add(url);

    console.log(`CustoJusto página ${page}: ${url}`);

    const response = await fetchHtml(url);

    const marker = '"listItems":[';
    const markerIndex = response.html.indexOf(marker);

    if (markerIndex === -1) {
      throw new Error("listItems não encontrado.");
    }

    const start = markerIndex + '"listItems":'.length;

    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;

    for (let i = start; i < response.html.length; i++) {
      const char = response.html[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === "[") depth++;
      if (char === "]") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    if (end === -1) {
      throw new Error("Fim de listItems não encontrado.");
    }

    const items = JSON.parse(
      response.html.slice(start, end + 1)
    );

    for (const item of items) {
      const location = item.locationNames || {};

      records.push({
        id: item.listID,
        title: item.title,

        district: location.district ?? null,
        county: location.county ?? null,
        parish: location.parish ?? null,

        city: null
      });
    }

    url = extractNextUrl(response.html);
  }

  return records;
}

function analyse(name, records) {
  console.log("\n========================================");
  console.log(name);
  console.log("========================================");

  console.log("TOTAL ANÚNCIOS:", records.length);

  const fields = [
    "district",
    "county",
    "parish",
    "city"
  ];

  for (const field of fields) {
    const filled = records.filter(
      record =>
        record[field] !== null &&
        record[field] !== undefined &&
        record[field] !== ""
    ).length;

    console.log(
      `${field}: ${filled}/${records.length}`
    );
  }

  const maps = {
    district: new Map(),
    county: new Map(),
    parish: new Map(),
    city: new Map()
  };

  for (const record of records) {
    for (const field of fields) {
      addCount(maps[field], record[field]);
    }
  }

  for (const field of fields) {
    console.log(`\n--- ${field.toUpperCase()} ---`);

    console.table(
      [...maps[field].entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100)
        .map(([value, count]) => ({
          value,
          count
        }))
    );
  }

  console.log("\n--- COMBINAÇÕES ---");

  const combinations = new Map();

  for (const record of records) {
    const key = [
      record.district || "(vazio)",
      record.county || "(vazio)",
      record.parish || "(vazio)",
      record.city || "(vazio)"
    ].join(" | ");

    combinations.set(
      key,
      (combinations.get(key) || 0) + 1
    );
  }

  console.table(
    [...combinations.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([combination, count]) => ({
        combination,
        count
      }))
  );

  console.log("\n--- ADDRESS KEYS ---");

  const addressKeys = new Map();

  for (const record of records) {
    for (const key of record.addressKeys || []) {
      addressKeys.set(
        key,
        (addressKeys.get(key) || 0) + 1
      );
    }
  }

  console.table(
    [...addressKeys.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({
        key,
        count
      }))
  );
}

const imovirtual = await collectImovirtual();
const custojusto = await collectCustoJusto();

analyse("IMOVIRTUAL", imovirtual);
analyse("CUSTOJUSTO", custojusto);