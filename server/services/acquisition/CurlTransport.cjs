const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const DEFAULT_HEADERS = Object.freeze({
  "User-Agent": "Mozilla/5.0",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1"
});

const DEFAULTS = Object.freeze({
  curlBinary: process.env.CURL_BIN || (process.platform === "win32" ? "curl.exe" : "curl"),
  timeoutMs: 30000,
  connectTimeoutMs: 10000,
  maxRedirects: 5,
  maxResponseBytes: 5 * 1024 * 1024,
  headers: DEFAULT_HEADERS
});

function validateUrl(value) {
  let url;
  try {
    url = new URL(String(value));
  } catch (_) {
    throw new TypeError("A URL de aquisição é inválida.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new TypeError("A URL de aquisição deve usar HTTP ou HTTPS.");
  }
  return url.toString();
}

function parseHeaderBlocks(rawHeaders) {
  const blocks = String(rawHeaders).split(/\r?\n\r?\n/).filter(Boolean);
  const parsed = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    const statusMatch = lines.shift().match(/^HTTP\/\S+\s+(\d+)\s*(.*)$/i);
    if (!statusMatch) continue;
    const headers = {};
    for (const line of lines) {
      const separator = line.indexOf(":");
      if (separator < 1) continue;
      headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
    }
    parsed.push({ status: Number(statusMatch[1]), statusText: statusMatch[2].trim(), headers });
  }
  return parsed;
}

class CurlTransport {
  constructor(options = {}) {
    this.options = { ...DEFAULTS, ...options, headers: { ...DEFAULT_HEADERS, ...(options.headers || {}) } };
    this.spawnImpl = options.spawnImpl || spawn;
  }

  async acquire(requestedUrl, options = {}) {
    const url = validateUrl(requestedUrl);
    const config = { ...this.options, ...options, headers: { ...this.options.headers, ...(options.headers || {}) } };
    const startedAt = Date.now();
    const tempDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "osflow-acquisition-"));
    const headerFile = path.join(tempDirectory, "headers.txt");
    const bodyFile = path.join(tempDirectory, "body.bin");
    const args = [
      "--location", "--silent", "--show-error",
      "--connect-timeout", String(Math.max(1, Math.ceil(config.connectTimeoutMs / 1000))),
      "--max-time", String(Math.max(1, Math.ceil(config.timeoutMs / 1000))),
      "--max-redirs", String(config.maxRedirects),
      "--max-filesize", String(config.maxResponseBytes),
      "--dump-header", headerFile,
      "--output", bodyFile,
      "--write-out", "%{url_effective}"
    ];
    for (const [name, value] of Object.entries(config.headers)) args.push("--header", `${name}: ${value}`);
    args.push(url);

    let metadata = "";
    let processError = null;
    let timedOut = false;
    let child;
    try {
      const result = await new Promise((resolve) => {
        child = this.spawnImpl(config.curlBinary, args, { windowsHide: true });
        if (child.stdout && typeof child.stdout.on === "function") child.stdout.on("data", (chunk) => { metadata += chunk.toString(); });
        child.on("error", (error) => { processError = error; resolve({ code: null }); });
        child.on("close", (code, signal) => resolve({ code, signal }));
        const timer = setTimeout(() => {
          if (!processError && child && typeof child.kill === "function") {
            timedOut = true;
            child.kill();
          }
        }, config.timeoutMs + 1000);
        timer.unref?.();
      });
      const exitCode = result.code;
      const durationMs = Date.now() - startedAt;
      if (timedOut) return { requestedUrl: url, durationMs, exitCode, errorType: "timeout", errorMessage: "O cURL excedeu o timeout total." };
      if (processError || exitCode !== 0) return { requestedUrl: url, durationMs, exitCode, errorType: "transport_error", errorMessage: processError?.message || `cURL terminou com exit code ${exitCode}.` };

      const [rawHeaders, body] = await Promise.all([fs.promises.readFile(headerFile, "utf8"), fs.promises.readFile(bodyFile)]);
      if (body.length > config.maxResponseBytes) return { requestedUrl: url, durationMs, exitCode, errorType: "response_too_large", errorMessage: "A resposta excedeu o limite configurado.", bytes: body.length };
      const blocks = parseHeaderBlocks(rawHeaders);
      const finalBlock = blocks[blocks.length - 1] || { status: 0, statusText: "", headers: {} };
      const contentType = finalBlock.headers["content-type"] || null;
      const response = {
        requestedUrl: url,
        finalUrl: metadata.trim() || url,
        status: finalBlock.status,
        statusText: finalBlock.statusText,
        headers: { ...finalBlock.headers },
        body: body.toString("utf8"),
        contentType,
        bytes: body.length,
        durationMs,
        redirects: blocks.filter((block) => block.status >= 300 && block.status < 400).length,
        exitCode
      };
      if (!response.status) return { ...response, errorType: "invalid_response", errorMessage: "O cURL não devolveu headers HTTP." };
      if (response.bytes === 0) return { ...response, errorType: "invalid_response", errorMessage: "A resposta HTTP tem body vazio." };
      if (response.status >= 400) return { ...response, errorType: "http_error", errorMessage: `HTTP ${response.status} ${response.statusText}` };
      if (contentType && !contentType.toLowerCase().includes("text/html")) return { ...response, errorType: "invalid_response", errorMessage: `Content-Type não HTML: ${contentType}` };
      return response;
    } finally {
      await fs.promises.rm(tempDirectory, { recursive: true, force: true });
    }
  }
}

module.exports = { CurlTransport, DEFAULT_HEADERS, DEFAULTS, parseHeaderBlocks, validateUrl };