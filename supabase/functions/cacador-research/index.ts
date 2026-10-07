import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function extractNextData(html: string): any | null {
  const match = html.match(/<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function findListing(value: unknown, externalId: string): any | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findListing(item, externalId);
      if (found) return found;
    }
    return null;
  }

  const object = value as Record<string, unknown>;
  if (String(object.id ?? "") === String(externalId)) return object;

  for (const child of Object.values(object)) {
    const found = findListing(child, externalId);
    if (found) return found;
  }
  return null;
}

function normalizeSnapshot(item: any, externalId: string, url: string, fetchedAt: string) {
  return {
    externalId: String(item?.id ?? externalId),
    title: item?.title ?? null,
    price: item?.totalPrice?.value ?? null,
    url,
    ownerName: item?.advertOwner?.name?.trim?.() || null,
    isPrivateOwner: Boolean(item?.isPrivateOwner),
    createdAtFirst: item?.createdAtFirst ?? null,
    fetchedAt
  };
}

function compareSnapshot(previous: any, current: any) {
  const fields = ["title", "price", "url", "ownerName", "isPrivateOwner", "createdAtFirst"];
  return fields.some((field) => String(previous?.[field] ?? "") !== String(current?.[field] ?? ""));
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse(405, { ok: false, error: "method_not_allowed" });

  try {
    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id.trim() : "";

    if (!id) return jsonResponse(400, { ok: false, error: "id_required" });

    const { data: lead, error: leadError } = await supabase
      .from("provider_leads")
      .select("id, external_id, provider, url, title, price, owner_name, is_private_owner, created_at_first, raw_data, cacador_research_data")
      .eq("id", id)
      .maybeSingle();

    if (leadError) throw leadError;
    if (!lead) return jsonResponse(404, { ok: false, error: "lead_not_found" });
    if (lead.provider !== "imovirtual") return jsonResponse(400, { ok: false, error: "unsupported_provider" });

    const url = lead.url || "https://www.imovirtual.com/pt/anuncio/" + encodeURIComponent(lead.external_id);
    const researchedAt = new Date().toISOString();

    await supabase.from("provider_leads")
      .update({ cacador_research_status: "running", cacador_research_error: null, updated_at: researchedAt })
      .eq("id", id);

    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8"
      }
    });

    if (!response.ok) {
      const status = response.status === 404 || response.status === 410 ? "removed" : "error";
      await supabase.from("provider_leads").update({
        cacador_last_research_at: researchedAt,
        cacador_research_status: status,
        cacador_research_error: "HTTP " + response.status,
        cacador_research_data: { researchedAt, httpStatus: response.status, url },
        updated_at: researchedAt
      }).eq("id", id);

      return jsonResponse(200, {
        ok: true,
        id,
        status,
        httpStatus: response.status
      });
    }

    const html = await response.text();
    const nextData = extractNextData(html);
    const listing = findListing(nextData, lead.external_id);
    const current = listing ? normalizeSnapshot(listing, lead.external_id, response.url || url, researchedAt) : null;

    if (!current) {
      await supabase.from("provider_leads").update({
        cacador_last_research_at: researchedAt,
        cacador_research_status: "active",
        cacador_research_error: null,
        cacador_research_data: { researchedAt, httpStatus: response.status, url, matched: false },
        updated_at: researchedAt
      }).eq("id", id);

      return jsonResponse(200, { ok: true, id, status: "active", matched: false });
    }

    const previous = lead.cacador_research_data?.current || lead.raw_data || {};
    const changed = compareSnapshot(previous, current);

    await supabase.from("provider_leads").update({
      cacador_last_research_at: researchedAt,
      cacador_research_status: changed ? "changed" : "active",
      cacador_research_error: null,
      cacador_research_data: {
        researchedAt,
        httpStatus: response.status,
        url,
        matched: true,
        changed,
        previous,
        current
      },
      updated_at: researchedAt
    }).eq("id", id);

    return jsonResponse(200, {
      ok: true,
      id,
      status: changed ? "changed" : "active",
      changed,
      current
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
