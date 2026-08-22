import { createClient } from "npm:@supabase/supabase-js";

const TARGET_IDS = [
  "19206122",
  "18814809",
  "19206120",
  "18958611",
  "19163964",
  "19191575",
  "19206114",
  "19205970",
  "19205971",
  "19205973"
] as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

function extractTipologiaFromDetailHtml(html: string | null | undefined): string | null {
  if (typeof html !== "string" || html.length === 0) return null;

  const normalizedHtml = html
    .replace(/&nbsp;/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedHtml) return null;

  const labelMatch = normalizedHtml.match(/Tipologia\s*[:\-]?\s*([TV](?:0|[1-9]\d*)(?:\+)?)/i);
  if (labelMatch) {
    const value = labelMatch[1].trim().toUpperCase();
    return /^(?:T|V)(?:0|[1-9]\d*)(?:\+)?$/.test(value) ? value : null;
  }

  const descriptionMatch = normalizedHtml.match(/(?:tipologia|tipologia comercial)\s*[:\-]?\s*([TV](?:0|[1-9]\d*)(?:\+)?)/i);
  if (descriptionMatch) {
    const value = descriptionMatch[1].trim().toUpperCase();
    return /^(?:T|V)(?:0|[1-9]\d*)(?:\+)?$/.test(value) ? value : null;
  }

  return null;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders
    });
  }

  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: rows, error: selectError } = await supabase
    .from("provider_leads")
    .select("id, external_id, raw_data")
    .eq("provider", "imovirtual")
    .in("external_id", TARGET_IDS)
    .limit(TARGET_IDS.length);

  if (selectError) {
    return new Response(
      JSON.stringify({ error: selectError.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

  const rowsByExternalId = new Map<string, Record<string, unknown>>();
  for (const row of rows ?? []) {
    rowsByExternalId.set(String(row.external_id), row);
  }

  const results: Array<{ external_id: string; tipologia: string | null; status: "FOUND" | "NOT_FOUND" | "INVALID" | "HTTP_ERROR" }> = [];
  let found = 0;
  let notFound = 0;
  let invalid = 0;
  let httpError = 0;

  for (const externalId of TARGET_IDS) {
    const row = rowsByExternalId.get(externalId);
    if (!row) {
      results.push({ external_id: externalId, tipologia: null, status: "NOT_FOUND" });
      notFound += 1;
      continue;
    }

    const url = `https://www.imovirtual.com/pt/anuncio/${externalId}`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
        }
      });

      if (!response.ok) {
        results.push({ external_id: externalId, tipologia: null, status: "HTTP_ERROR" });
        httpError += 1;
        continue;
      }

      const html = await response.text();
      const extracted = extractTipologiaFromDetailHtml(html);

      if (!extracted) {
        results.push({ external_id: externalId, tipologia: null, status: "NOT_FOUND" });
        notFound += 1;
        continue;
      }

      const validTipologiaPattern = /^(?:T|V)(?:0|[1-9]\d*)(?:\+)?$/;
      if (!validTipologiaPattern.test(extracted)) {
        results.push({ external_id: externalId, tipologia: extracted, status: "INVALID" });
        invalid += 1;
        continue;
      }

      results.push({ external_id: externalId, tipologia: extracted.toUpperCase(), status: "FOUND" });
      found += 1;
    } catch (_error) {
      results.push({ external_id: externalId, tipologia: null, status: "HTTP_ERROR" });
      httpError += 1;
    }
  }

  return new Response(
    JSON.stringify({
      results,
      totals: {
        FOUND: found,
        NOT_FOUND: notFound,
        INVALID: invalid,
        HTTP_ERROR: httpError
      }
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );
});
