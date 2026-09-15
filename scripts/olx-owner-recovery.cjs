const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const INPUT_FILE = path.resolve("scripts", "olx-owner-recovery-input.csv");
const OUTPUT_FILE = path.resolve("scripts", "olx-owner-recovery-preview.csv");

const OLX_DELAY_MS = 1500;
const TIMEOUT_MS = 30000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number(code))
    );
}

function textFrom(value) {
  if (!value) return null;

  const text = decodeHtmlEntities(
    String(value)
      .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
      .replace(/<!--[^]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();

  return text || null;
}

function normalizeOwnerName(value) {
  return (
    textFrom(value)?.replace(/No OLX desde[\s\S]*$/i, "").trim() || null
  );
}

function extractOwnerName(html) {
  const sellerLink = html.match(
    /<a\b([^>]*)data-testid\s*=\s*["']user-profile-link["'][^>]*>([\s\S]*?)<\/a\s*>/i
  );

  return normalizeOwnerName(sellerLink?.[2]);
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

function readInput() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(
      `Ficheiro de entrada não encontrado: ${INPUT_FILE}`
    );
  }

  const lines = fs
    .readFileSync(INPUT_FILE, "utf8")
    .split(/\r?\n/)
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("Ficheiro de entrada sem registos.");
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return Object.fromEntries(
      headers.map((header, index) => [
        header,
        values[index] ?? "",
      ])
    );
  });
}

async function fetchOlx(url) {
  const { stdout } = await execFileAsync(
    "curl.exe",
    [
      "-L",
      "-A",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/142 Safari/537.36",
      "--max-time",
      String(TIMEOUT_MS / 1000),
      "-w",
      "\n%{http_code}",
      url,
    ],
    {
      timeout: TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024,
      encoding: "utf8",
    }
  );

  const statusLineStart = stdout.lastIndexOf("\n");
  const html = stdout.slice(0, statusLineStart);
  const status = Number(stdout.slice(statusLineStart + 1).trim());

  return {
    status,
    html,
  };
}

async function main() {
  const rows = readInput();

  console.log(`Registos para recuperação: ${rows.length}`);
  console.log("Modo: PREVIEW — nenhuma alteração na BD\n");

  const results = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    process.stdout.write(
      `[${index + 1}/${rows.length}] ${row.external_id} ... `
    );

    try {
      const response = await fetchOlx(row.url);

      if (response.status !== 200) {
        console.log(`HTTP ${response.status}`);

        results.push({
          id: row.id,
          external_id: row.external_id,
          owner_name_atual: row.owner_name,
          owner_name_recuperado: "",
          status: `HTTP_${response.status}`,
          url: row.url,
        });
      } else {
        const ownerName = extractOwnerName(response.html);

        if (ownerName) {
          console.log(ownerName);

          results.push({
            id: row.id,
            external_id: row.external_id,
            owner_name_atual: row.owner_name,
            owner_name_recuperado: ownerName,
            status: "RECUPERADO",
            url: row.url,
          });
        } else {
          console.log("NAO_ENCONTRADO");

          results.push({
            id: row.id,
            external_id: row.external_id,
            owner_name_atual: row.owner_name,
            owner_name_recuperado: "",
            status: "NAO_ENCONTRADO",
            url: row.url,
          });
        }
      }
    } catch (error) {
      console.log(`ERRO: ${error.message}`);

      results.push({
        id: row.id,
        external_id: row.external_id,
        owner_name_atual: row.owner_name,
        owner_name_recuperado: "",
        status: "ERRO",
        url: row.url,
      });
    }

    if (index < rows.length - 1) {
      await sleep(OLX_DELAY_MS);
    }
  }

  const headers = [
    "id",
    "external_id",
    "owner_name_atual",
    "owner_name_recuperado",
    "status",
    "url",
  ];

  const csv = [
    headers.join(","),
    ...results.map((row) =>
      headers.map((header) => csvEscape(row[header])).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(OUTPUT_FILE, csv, "utf8");

  const recovered = results.filter(
    (row) => row.status === "RECUPERADO"
  ).length;

  const notFound = results.filter(
    (row) => row.status === "NAO_ENCONTRADO"
  ).length;

  const errors = results.filter(
    (row) =>
      row.status === "ERRO" ||
      row.status.startsWith("HTTP_")
  ).length;

  console.log("\n--------------------------------");
  console.log("PREVIEW CONCLUÍDO");
  console.log("--------------------------------");
  console.log(`Total:          ${results.length}`);
  console.log(`Recuperados:    ${recovered}`);
  console.log(`Não encontrados:${notFound}`);
  console.log(`Erros/HTTP:     ${errors}`);
  console.log(`\nResultado: ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error("\nERRO FATAL:", error.message);
  process.exit(1);
});