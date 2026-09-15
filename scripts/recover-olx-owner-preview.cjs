const fs = require("fs");
const path = require("path");

const INPUT = path.resolve(
  process.argv[2] || "olx-owner-input.csv"
);

const OUTPUT = path.resolve(
  process.argv[3] || "olx-owner-preview.csv"
);

const rows = fs
  .readFileSync(INPUT, "utf8")
  .split(/\r?\n/)
  .filter(Boolean);

if (rows.length < 2) {
  throw new Error("CSV sem dados.");
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

const headers = parseCsvLine(rows[0]);

const data = rows.slice(1).map((line) => {
  const values = parseCsvLine(line);
  return Object.fromEntries(
    headers.map((header, index) => [header, values[index] ?? ""])
  );
});

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function extractOwnerName(html) {
  // Procuramos o link do vendedor no HTML público.
  // Mantemos a extração conservadora: se não houver
  // um padrão claro, devolvemos null.
  const patterns = [
    /data-testid=["']user-profile-link["'][^>]*>([\s\S]*?)<\/a>/i,
    /data-testid=["']seller-profile-link["'][^>]*>([\s\S]*?)<\/a>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match) {
      const text = match[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const normalized = text
        .replace(/No OLX desde[\s\S]*$/i, "")
        .trim();

      if (normalized) return normalized;
    }
  }

  return null;
}

async function fetchWithTimeout(url, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/142 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    const html = await response.text();

    return {
      status: response.status,
      html,
    };
  } finally {
    clearTimeout(timer);
  }
}

const output = [];

for (let index = 0; index < data.length; index += 1) {
  const row = data[index];

  process.stdout.write(
    `[${index + 1}/${data.length}] ${row.external_id} ... `
  );

  try {
    const result = await fetchWithTimeout(row.url);

    if (result.status !== 200) {
      console.log(`HTTP ${result.status}`);

      output.push({
        id: row.id,
        external_id: row.external_id,
        owner_name_atual: row.owner_name,
        owner_name_recuperado: "",
        status: `HTTP_${result.status}`,
      });

      continue;
    }

    const owner = extractOwnerName(result.html);

    if (owner) {
      console.log(owner);
    } else {
      console.log("NAO_ENCONTRADO");
    }

    output.push({
      id: row.id,
      external_id: row.external_id,
      owner_name_atual: row.owner_name,
      owner_name_recuperado: owner || "",
      status: owner ? "RECUPERADO" : "NAO_ENCONTRADO",
    });
  } catch (error) {
    console.log(`ERRO: ${error.message}`);

    output.push({
      id: row.id,
      external_id: row.external_id,
      owner_name_atual: row.owner_name,
      owner_name_recuperado: "",
      status: "ERRO",
    });
  }

  // Evita uma sequência agressiva contra o OLX.
  await new Promise((resolve) => setTimeout(resolve, 1500));
}

const csv = [
  [
    "id",
    "external_id",
    "owner_name_atual",
    "owner_name_recuperado",
    "status",
  ].join(","),
  ...output.map((row) =>
    [
      row.id,
      row.external_id,
      row.owner_name_atual,
      row.owner_name_recuperado,
      row.status,
    ]
      .map(csvEscape)
      .join(",")
  ),
].join("\n");

fs.writeFileSync(OUTPUT, csv, "utf8");

console.log("");
console.log(`Preview concluído: ${OUTPUT}`);
console.log(
  `Recuperados: ${output.filter((r) => r.status === "RECUPERADO").length}`
);
console.log(
  `Não encontrados: ${
    output.filter((r) => r.status === "NAO_ENCONTRADO").length
  }`
);
console.log(
  `Erros: ${output.filter((r) => r.status === "ERRO").length}`
);