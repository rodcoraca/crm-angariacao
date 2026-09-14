const RETRYABLE_HTTP = new Set([429]);

function isRetryable(result) {
  return result?.errorType === "timeout" || result?.errorType === "transport_error" || RETRYABLE_HTTP.has(result?.status) || (result?.status >= 500 && result?.status <= 599);
}

function wait(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

class AcquisitionWorker {
  constructor({ transport, ...options } = {}) {
    if (!transport || typeof transport.acquire !== "function") throw new TypeError("AcquisitionWorker requer um transport válido.");
    this.transport = transport;
    this.defaults = { maxPages: 1, maxRequests: 1, maxRedirects: 5, maxRetries: 1, maxResponseBytes: 5 * 1024 * 1024, timeoutMs: 30000, connectTimeoutMs: 10000, delayBetweenRequestsMs: 0, retryBackoffMs: 250, ...options };
  }

  async acquire(url, options = {}) {
    const config = { ...this.defaults, ...options };
    let retryCount = 0;
    let result;
    do {
      result = await this.transport.acquire(url, config);
      if (!isRetryable(result) || retryCount >= config.maxRetries) break;
      retryCount += 1;
      await wait(config.retryBackoffMs * retryCount);
    } while (true);
    return { ...result, retryCount, attempts: retryCount + 1 };
  }

  async run({ url, nextUrlResolver, ...options } = {}) {
    if (!url) throw new TypeError("A URL inicial é obrigatória.");
    const config = { ...this.defaults, ...options };
    const visited = new Set();
    const pages = [];
    let nextUrl = String(url);
    let retries = 0;
    let requests = 0;
    while (nextUrl && pages.length < config.maxPages && requests < config.maxRequests && !visited.has(nextUrl)) {
      visited.add(nextUrl);
      if (pages.length > 0) await wait(config.delayBetweenRequestsMs);
      const page = await this.acquire(nextUrl, {
        ...config,
        maxRetries: Math.min(config.maxRetries, Math.max(0, config.maxRequests - requests - 1))
      });
      pages.push(page);
      requests += page.attempts || 1;
      retries += page.retryCount || 0;
      if (page.errorType || typeof nextUrlResolver !== "function") break;
      nextUrl = nextUrlResolver(page) || null;
    }
    const bytes = pages.reduce((total, page) => total + (page.bytes || 0), 0);
    return { pages, requests, pagesCount: pages.length, bytes, retries, visitedUrls: [...visited] };
  }
}

module.exports = { AcquisitionWorker, isRetryable };