const fs = require("fs");
const path = require("path");

describe("login-by-username security hardening", () => {
  const repoRoot = path.resolve(__dirname, "../../../../");
  const loginFunctionPath = path.join(repoRoot, "supabase/functions/login-by-username/index.ts");
  const statusFunctionPath = path.join(repoRoot, "supabase/functions/check-login-account-status/index.ts");
  const migrationPath = path.join(repoRoot, "supabase/migrations/20261106_db099_login_username_rate_limit.sql");

  test("migration uses atomic upsert and blocks public access", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.login_username_attempts");
    expect(sql).toContain("primary key (bucket_type, bucket_key)");
    expect(sql).toContain("INSERT INTO public.login_username_attempts");
    expect(sql).toContain("ON CONFLICT (bucket_type, bucket_key)");
    expect(sql).toContain("DO UPDATE SET");
    expect(sql).toContain("alter table public.login_username_attempts enable row level security");
    expect(sql).toContain("revoke all on table public.login_username_attempts from public");
    expect(sql).toContain("revoke all on function public.check_and_increment_login_attempt");
    expect(sql).toContain("grant execute on function public.check_and_increment_login_attempt");
  });

  test("reads only cf-connecting-ip and rejects empty or malformed values", () => {
    const content = fs.readFileSync(loginFunctionPath, "utf8");

    expect(content).toContain('request.headers.get("cf-connecting-ip")');
    expect(content).not.toContain('request.headers.get("x-forwarded-for")');
    expect(content).not.toContain('request.headers.get("x-real-ip")');
    expect(content).toContain('normalized.includes(",")');
    expect(content).toContain("isValidIpAddress(normalized)");
  });

  test("accepts IPv4 and IPv6 values from cf-connecting-ip", () => {
    const content = fs.readFileSync(loginFunctionPath, "utf8");

    expect(content).toContain("ipaddr.parse");
    expect(content).toContain("toNormalizedString");
    expect(content).toContain("return Boolean(canonicalizeIpAddress(value));");
  });

  test("fails closed when the HMAC secret is absent", () => {
    const content = fs.readFileSync(loginFunctionPath, "utf8");

    expect(content).toContain("LOGIN_USERNAME_RATE_LIMIT_HMAC_SECRET");
    expect(content).toContain("rateLimitHmacSecret");
    expect(content).toContain("length < 16");
    expect(content).toContain('code: "rate_limit_unavailable"');
  });

  test("uses HMAC-SHA-256 to hash the bucket keys without storing raw values", () => {
    const content = fs.readFileSync(loginFunctionPath, "utf8");

    expect(content).toContain("createHmacBucketKey");
    expect(content).toContain('"HMAC"');
    expect(content).toContain('"SHA-256"');
    expect(content).toContain('createHmacBucketKey("ip"');
    expect(content).toContain('createHmacBucketKey("username"');
    expect(content).not.toContain('p_bucket_key: ip');
    expect(content).not.toContain('p_bucket_key: username');
  });

  test("ignores spoofed x-forwarded-for and x-real-ip values when deriving the bucket key", () => {
    const content = fs.readFileSync(loginFunctionPath, "utf8");

    expect(content).not.toContain('request.headers.get("x-forwarded-for")');
    expect(content).not.toContain('request.headers.get("x-real-ip")');
    expect(content).toContain('const cfConnectingIp = request.headers.get("cf-connecting-ip") || "";');
  });

  test("same IP or username values normalize to stable HMAC output", () => {
    const content = fs.readFileSync(loginFunctionPath, "utf8");

    expect(content).toContain('String(rawValue ?? "").trim().toLowerCase()');
    expect(content).toContain('const material = `${type}:${');
    expect(content).toContain("Array.from(new Uint8Array(digest))");
  });

  test("canonicalizes equivalent IP addresses before hashing", () => {
    const content = fs.readFileSync(loginFunctionPath, "utf8");

    expect(content).toContain("canonicalizeIpAddress");
    expect(content).toContain("ipaddr.parse");
    expect(content).toContain("toNormalizedString");
    expect(content).toContain("normalized.includes(\"/\")");
  });

  test("rejects malformed CIDR or list-style IP values before rate limiting", () => {
    const content = fs.readFileSync(loginFunctionPath, "utf8");

    expect(content).toContain("normalized.includes(\",\")");
    expect(content).toContain("normalized.includes(\" \")");
    expect(content).toContain("normalized.includes(\"/\")");
  });

  test("login-by-username evaluates IP and username limits separately and fails closed", () => {
    const content = fs.readFileSync(loginFunctionPath, "utf8");

    expect(content).toContain('evaluateRateLimit(adminClient, "ip", ipBucketKey)');
    expect(content).toContain('evaluateRateLimit(adminClient, "username", usernameBucketKey)');
    expect(content).toContain("if (!ip)");
    expect(content).toContain('rate_limit_unavailable');
    expect(content).not.toContain("createRateLimitKey(ip, username)");
  });

  test("check-login-account-status remains a compatibility stub with no account leakage", () => {
    const content = fs.readFileSync(statusFunctionPath, "utf8");

    expect(content).toContain('status: "unknown"');
    expect(content).not.toContain("usuarios");
    expect(content).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(content).not.toContain("account_status");
    expect(content).not.toContain("resolveStatus");
  });

  test("CORS stays restricted to the allowlist and is applied on all responses", () => {
    const content = fs.readFileSync(loginFunctionPath, "utf8");

    expect(content).toContain("allowedOrigins");
    expect(content).toContain('"Access-Control-Allow-Origin"');
    expect(content).not.toContain('"Access-Control-Allow-Origin": "*"');
    expect(content).toContain("return jsonResponse(429");
    expect(content).toContain("return jsonResponse(503");
  });
});
