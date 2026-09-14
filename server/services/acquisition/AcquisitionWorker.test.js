const fs = require("fs");
const { EventEmitter } = require("events");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { AcquisitionWorker } = require("./AcquisitionWorker.cjs");
const { CurlTransport } = require("./CurlTransport.cjs");

function fakeSpawn({ status = 200, body = "<html>x</html>", contentType = "text/html", exitCode = 0, error, neverClose = false, rawHeaders, onArgs } = {}) {
  return (_binary, args) => {
    onArgs?.(args);
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.kill = () => child.emit("close", null, "SIGTERM");
    process.nextTick(() => {
      const headersPath = args[args.indexOf("--dump-header") + 1];
      const bodyPath = args[args.indexOf("--output") + 1];
      if (error) return child.emit("error", error);
      fs.writeFileSync(headersPath, rawHeaders || `HTTP/1.1 ${status} ${status === 200 ? "OK" : "Error"}\r\nContent-Type: ${contentType}\r\n\r\n`);
      fs.writeFileSync(bodyPath, body);
      child.stdout.emit("data", Buffer.from("https://example.test/final"));
      if (!neverClose) child.emit("close", exitCode);
    });
    return child;
  };
}

describe("CurlTransport", () => {
  it("captura resposta HTTP 200 e mantém URL como argumento separado", async () => {
    const result = await new CurlTransport({ spawnImpl: fakeSpawn() }).acquire("https://example.test/a?x=a%20b");
    assert.equal(result.status, 200);
    assert.match(result.body, /<html>/);
    assert.equal(result.finalUrl, "https://example.test/final");
    assert.equal(result.exitCode, 0);
  });

  for (const status of [403, 429, 500]) it(`classifica HTTP ${status} sem o transformar em erro de processo`, async () => {
    const result = await new CurlTransport({ spawnImpl: fakeSpawn({ status }) }).acquire("https://example.test");
    assert.equal(result.errorType, "http_error");
    assert.equal(result.status, status);
  });

  it("trata body vazio e content type inválido, mantendo limites configuráveis", async () => {
    const empty = await new CurlTransport({ spawnImpl: fakeSpawn({ body: "" }) }).acquire("https://example.test");
    const json = await new CurlTransport({ spawnImpl: fakeSpawn({ contentType: "application/json" }) }).acquire("https://example.test");
    assert.equal(empty.errorType, "invalid_response");
    assert.equal(json.errorType, "invalid_response");
    assert.equal(new CurlTransport({ maxRedirects: 2 }).options.maxRedirects, 2);
    assert.equal(new CurlTransport({ maxResponseBytes: 12 }).options.maxResponseBytes, 12);
    const oversized = await new CurlTransport({ maxResponseBytes: 4, spawnImpl: fakeSpawn({ body: "12345" }) }).acquire("https://example.test");
    assert.equal(oversized.errorType, "response_too_large");
  });

  it("contabiliza redirects múltiplos e preserva configuração do binário/argumentos", async () => {
    let capturedArgs;
    const result = await new CurlTransport({ curlBinary: "custom-curl", spawnImpl: fakeSpawn({ onArgs: (args) => { capturedArgs = args; }, rawHeaders: "HTTP/1.1 301 Moved\r\nLocation: /one\r\n\r\nHTTP/1.1 302 Found\r\nLocation: /two\r\n\r\nHTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n" }) }).acquire("https://example.test/a?x=one%20two");
    assert.equal(result.redirects, 2);
    assert.equal(capturedArgs[capturedArgs.length - 1], "https://example.test/a?x=one%20two");
  });

  it("distingue erro de rede, exit code e timeout", async () => {
    const network = await new CurlTransport({ spawnImpl: fakeSpawn({ error: new Error("DNS") }) }).acquire("https://example.test");
    const exit = await new CurlTransport({ spawnImpl: fakeSpawn({ exitCode: 7 }) }).acquire("https://example.test");
    const timeout = await new CurlTransport({ timeoutMs: 1, spawnImpl: fakeSpawn({ neverClose: true }) }).acquire("https://example.test");
    assert.equal(network.errorType, "transport_error");
    assert.equal(exit.errorType, "transport_error");
    assert.equal(timeout.errorType, "timeout");
  });
});

describe("AcquisitionWorker", () => {
  const response = (status, extra = {}) => ({ status, bytes: 10, durationMs: 1, ...extra });

  it("faz retry em 500, mas não em 403", async () => {
    let acquireCalls = 0;
    const acquire = async () => { acquireCalls += 1; return response(acquireCalls === 1 ? 500 : 200); };
    const worker = new AcquisitionWorker({ transport: { acquire }, retryBackoffMs: 0, maxRetries: 1 });
    assert.equal((await worker.acquire("https://example.test")).retryCount, 1);
    let blockedCalls = 0;
    const blockedAcquire = async () => { blockedCalls += 1; return response(403); };
    const blockedWorker = new AcquisitionWorker({ transport: { acquire: blockedAcquire }, retryBackoffMs: 0, maxRetries: 3 });
    assert.equal((await blockedWorker.acquire("https://example.test")).retryCount, 0);
    assert.equal(blockedCalls, 1);
    let retry429Calls = 0;
    const retry429 = async () => { retry429Calls += 1; return response(retry429Calls === 1 ? 429 : 200); };
    const retry429Worker = new AcquisitionWorker({ transport: { acquire: retry429 }, retryBackoffMs: 0, maxRetries: 1 });
    assert.equal((await retry429Worker.acquire("https://example.test")).retryCount, 1);
    let maxRetryCalls = 0;
    const always500 = async () => { maxRetryCalls += 1; return response(500); };
    const maxRetryWorker = new AcquisitionWorker({ transport: { acquire: always500 }, retryBackoffMs: 0, maxRetries: 2 });
    assert.equal((await maxRetryWorker.acquire("https://example.test")).retryCount, 2);
    assert.equal(maxRetryCalls, 3);
  });

  it("respeita maxRequests, paginação sequencial e URLs duplicadas", async () => {
    let acquireCalls = 0;
    const acquire = async (requestedUrl) => { acquireCalls += 1; return response(200, { requestedUrl }); };
    const worker = new AcquisitionWorker({ transport: { acquire }, maxRequests: 3, maxPages: 5 });
    const result = await worker.run({ url: "https://example.test/1", nextUrlResolver: ({ requestedUrl }) => requestedUrl === "https://example.test/1" ? "https://example.test/2" : "https://example.test/1" });
    assert.equal(result.pagesCount, 2);
    assert.equal(result.requests, 2);
    assert.equal(acquireCalls, 2);
  });

  it("valida transport e URL, sem construir comando shell", async () => {
    assert.throws(() => new AcquisitionWorker());
    const transport = new CurlTransport({ spawnImpl: fakeSpawn() });
    await assert.rejects(transport.acquire("file:///unsafe"));
  });
});