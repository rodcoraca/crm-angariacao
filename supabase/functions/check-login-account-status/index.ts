const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const allowedOrigins = new Set([
  "https://app.osflow.pt",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:4173",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:5173",
  "https://127.0.0.1:3000",
  "https://127.0.0.1:3001",
  "https://127.0.0.1:4173",
  "https://127.0.0.1:5173"
]);

function jsonResponse(status: number, body: Record<string, unknown>, responseHeaders = corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...responseHeaders
    }
  });
}

function resolveCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || request.headers.get("Origin") || "";

  if (!origin || !allowedOrigins.has(origin)) {
    return { ...corsHeaders };
  }

  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": origin
  };
}

Deno.serve(async (request) => {
  const headers = resolveCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { status: "unknown" }, headers);
  }

  try {
    await request.json().catch(() => ({}));
    return jsonResponse(200, { status: "unknown" }, headers);
  } catch {
    return jsonResponse(200, { status: "unknown" }, headers);
  }
});
