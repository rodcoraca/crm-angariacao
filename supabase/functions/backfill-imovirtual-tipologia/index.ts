import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

const PRODUCTION_EMPRESA_ID =
  "036d7669-c8ed-44c2-86cc-bf949b54b812";

const VALID_TIPOLOGIA = /^(?:T|V)(?:0|[1-9][0-9]*)(?:\+)?$/i;

type ResultStatus =
  | "FOUND"
  | "NOT_FOUND"
  | "INVALID"
  | "HTTP_ERROR"
  | "NOT_PRODUCTION";

interface Result {
  id: string;
  external_id: string;
  url: string | null;
  tipologia: string | null;
  status: ResultStatus;
  error?: string;
}

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

function extractTipologia(html: string): string | null {
  return extractTipologiaFromDetailHtml(html);
}

async function fetchTipologia(url: string): Promise<{
  tipologia: string | null;
  status: ResultStatus;
  error?: string;
}> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/126.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      return {
        tipologia: null,
        status: "HTTP_ERROR",
        error: `HTTP ${response.status}`,
      };
    }

    const html = await response.text();
    const tipologia = extractTipologia(html);

    if (!tipologia) {
      return {
        tipologia: null,
        status: "NOT_FOUND",
      };
    }

    if (!VALID_TIPOLOGIA.test(tipologia)) {
      return {
        tipologia: null,
        status: "INVALID",
      };
    }

    return {
      tipologia,
      status: "FOUND",
    };
  } catch (error) {
    return {
      tipologia: null,
      status: "HTTP_ERROR",
      error: error instanceof Error
        ? error.message
        : String(error),
    };
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "POST required",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));

    const batchSize = Math.min(
      Math.max(Number(body.batch_size) || 100, 1),
      100,
    );

    /*
     * Segurança:
     * por defeito é DRY-RUN.
     */
    const dryRun = body.dry_run !== false;

    /*
     * Só aceitamos o tenant de produção conhecido.
     */
    const empresaId =
      body.empresa_id || PRODUCTION_EMPRESA_ID;

    if (empresaId !== PRODUCTION_EMPRESA_ID) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid production empresa_id",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    /*
     * Seleção exclusivamente de produção:
     *
     * empresa_provider_listings
     *        ↓
     * provider_leads
     */
   const requestedExternalId =
  typeof body.external_id === "string" &&
  body.external_id.trim()
    ? body.external_id.trim()
    : null;

if (requestedExternalId && !dryRun) {
  return new Response(
    JSON.stringify({
      success: false,
      error:
        "external_id is allowed only in dry_run mode",
    }),
    {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

let query = supabase
  .from("empresa_provider_listings")
  .select(`
    provider_lead_id,
    provider_leads!inner (
      id,
      external_id,
      url,
      raw_data,
      provider
    )
  `)
  .eq("empresa_id", PRODUCTION_EMPRESA_ID)
  .eq("provider_leads.provider", "imovirtual")
  .not("provider_leads.external_id", "is", null);

let rows: any[] = [];

if (requestedExternalId) {
  const { data, error } = await supabase
    .from("empresa_provider_listings")
    .select(`
      provider_lead_id,
      provider_leads!inner (
        id,
        external_id,
        url,
        raw_data,
        provider
      )
    `)
    .eq("empresa_id", PRODUCTION_EMPRESA_ID)
    .eq("provider_leads.provider", "imovirtual")
    .not("provider_leads.external_id", "is", null)
    .eq("provider_leads.external_id", requestedExternalId)
    .limit(1);

  if (error) {
    throw new Error(`Selection error: ${error.message}`);
  }

  rows = data || [];
} else {
  const { data, error } = await supabase
    .from("provider_leads")
    .select(`
      id,
      external_id,
      url,
      raw_data,
      provider,
      empresa_provider_listings!inner (
        empresa_id
      )
    `)
    .eq("provider", "imovirtual")
    .eq("empresa_provider_listings.empresa_id", PRODUCTION_EMPRESA_ID)
    .not("external_id", "is", null)
    .or("raw_data->>tipologia.is.null,raw_data->>tipologia.eq.\"\"")
    .limit(batchSize);

  if (error) {
    throw new Error(`Selection error: ${error.message}`);
  }

  rows = data || [];
}

    const candidates = rows.filter((lead: any) => {
    const tipologia =
      lead?.raw_data?.tipologia;
    const backfillChecked =
      lead?.raw_data?.tipologia_backfill?.checked === true;

    return (
      !backfillChecked &&
      (
        tipologia === null ||
        tipologia === undefined ||
        String(tipologia).trim() === ""
      )
    );
  })
  .slice(0, batchSize);

    const results: Result[] = [];

    let found = 0;
    let notFound = 0;
    let invalid = 0;
    let httpError = 0;
    let updated = 0;

    const markBackfillChecked = async (
  lead: any,
  status: string,
  error?: string,
) => {
  if (dryRun) {
    return;
  }

  const currentRawData =
    lead.raw_data &&
    typeof lead.raw_data === "object"
      ? lead.raw_data
      : {};

  const newRawData = {
    ...currentRawData,
    tipologia_backfill: {
      checked: true,
      status,
      checked_at: new Date().toISOString(),
      ...(error ? { error } : {}),
    },
  };

  const { error: markError } =
    await supabase
      .from("provider_leads")
      .update({
        raw_data: newRawData,
      })
      .eq("id", lead.id)
      .eq("provider", "imovirtual");

  if (markError) {
    throw new Error(
      `Backfill marker update error: ${markError.message}`,
    );
  }
};

    for (const lead of candidates) {
      const externalId = String(lead.external_id);
      const url = lead.url || lead.raw_data?.url || null;

      if (!url) {
        results.push({
          id: lead.id,
          external_id: externalId,
          url: null,
          tipologia: null,
          status: "NOT_FOUND",
          error: "No URL available",
        });

        notFound++;
        continue;
      }

      const extraction = await fetchTipologia(url);

      if (extraction.status === "FOUND") {
        found++;

        /*
         * DRY-RUN:
         * não altera absolutamente nada.
         */
        if (!dryRun) {
          const currentRawData =
            lead.raw_data &&
            typeof lead.raw_data === "object"
              ? lead.raw_data
              : {};

          const newRawData = {
            ...currentRawData,
            tipologia: extraction.tipologia,
            tipologia_backfill: {
              checked: true,
              status: "FOUND",
              checked_at: new Date().toISOString(),
            },
          };

          const { error: updateError } =
            await supabase
              .from("provider_leads")
              .update({
                raw_data: newRawData,
              })
              .eq("id", lead.id)
              .eq(
                "provider",
                "imovirtual",
              );

          if (updateError) {
            results.push({
              id: lead.id,
              external_id: externalId,
              url,
              tipologia: extraction.tipologia,
              status: "HTTP_ERROR",
              error:
                `UPDATE error: ${updateError.message}`,
            });

            httpError++;
            continue;
          }

          updated++;
        }

        results.push({
          id: lead.id,
          external_id: externalId,
          url,
          tipologia: extraction.tipologia,
          status: "FOUND",
        });

        continue;
      }

      if (extraction.status === "INVALID") {
        invalid++;

        if (!dryRun) {
          await markBackfillChecked(
            lead,
            "INVALID",
            extraction.error,
          );
        }

        results.push({
          id: lead.id,
          external_id: externalId,
          url,
          tipologia: null,
          status: "INVALID",
          error: extraction.error,
        });

        continue;
      }

      if (extraction.status === "HTTP_ERROR") {
        httpError++;

        const isGone = String(extraction.error || "").includes("HTTP 410");

        if (!dryRun && isGone) {
          await markBackfillChecked(
            lead,
            "HTTP_ERROR",
            extraction.error,
          );
        }

        results.push({
          id: lead.id,
          external_id: externalId,
          url,
          tipologia: null,
          status: "HTTP_ERROR",
          error: extraction.error,
        });

        continue;
      }

      notFound++;

      if (!dryRun) {
        await markBackfillChecked(
          lead,
          "NOT_FOUND",
          extraction.error,
        );
      }

      results.push({
        id: lead.id,
        external_id: externalId,
        url,
        tipologia: null,
        status: "NOT_FOUND",
      });
    }

    return new Response(
      JSON.stringify(
        {
          success: true,
          dry_run: dryRun,
          empresa_id: PRODUCTION_EMPRESA_ID,
          provider: "imovirtual",

          batch: {
            requested: batchSize,
            selected: candidates.length,
            processed: results.length,
          },

          totals: {
            found,
            not_found: notFound,
            invalid,
            http_error: httpError,
            updated,
          },

          results,
        },
        null,
        2,
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
});