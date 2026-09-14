import { executeProviderSync } from "./executeProviderSync";

function createSupabaseInsertMock(insertedRows) {
  return {
    from(table) {
      if (table === "provider_leads") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          in() {
            return Promise.resolve({ data: [], error: null });
          },
          insert(rows) {
            insertedRows.push(...rows);
            return {
              select() {
                return this;
              },
              single() {
                return Promise.resolve({ data: { id: rows[0].external_id }, error: null });
              }
            };
          }
        };
      }

      if (table === "empresa_provider_listings") {
        return {
          upsert() {
            return Promise.resolve({ error: null });
          }
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }
  };
}

function baseListing(externalId, overrides = {}) {
  return {
    externalId,
    url: `https://www.olx.pt/d/anuncio/${externalId}.html`,
    location: "Porto",
    createdAtFirst: null,
    source: "olx",
    ...overrides
  };
}

describe("executeProviderSync normalized contract", () => {
  it("preserves location, converts Hoje and keeps null owner unclassified", async () => {
    const insertedRows = [];
    const result = await executeProviderSync({
      providerName: "olx",
      empresaId: "empresa-1",
      listings: [baseListing("IDJ123", {
        isPrivateOwner: null,
        publishedAt: "Hoje às 09:37"
      })],
      fetchedAt: "2026-09-13T12:00:00.000Z",
      supabaseClient: createSupabaseInsertMock(insertedRows),
      allowListingsWithoutCreatedAtFirst: true
    });

    expect(result.analyzedPrivateOwners).toBe(0);
    expect(result.analyzedAgencies).toBe(0);
    expect(insertedRows[0]).toMatchObject({
      location: "Porto",
      is_private_owner: null,
      created_at_first: null,
      published_at: "2026-09-13T08:37:00.000Z"
    });
  });

  it("converts Para o topo to a pure published_at timestamp", async () => {
    const insertedRows = [];
    await executeProviderSync({
      providerName: "olx",
      empresaId: "empresa-1",
      listings: [baseListing("IDJpromotion", {
        publishedAt: "Para o topo hoje às 11:41",
        publishedAtSource: "promotion"
      })],
      fetchedAt: "2026-09-13T12:00:00.000Z",
      supabaseClient: createSupabaseInsertMock(insertedRows),
      allowListingsWithoutCreatedAtFirst: true
    });

    expect(insertedRows[0].published_at).toBe("2026-09-13T10:41:00.000Z");
    expect(insertedRows[0].published_at).not.toContain("*");
    expect(insertedRows[0].raw_data.publishedAtSource).toBe("promotion");
  });

  it("persists CustoJusto publishedAt independently from createdAtFirst", async () => {
    const insertedRows = [];
    await executeProviderSync({
      providerName: "custojusto",
      empresaId: "empresa-1",
      listings: [baseListing("CJ123", {
        source: "custojusto",
        createdAtFirst: "2026-09-12T10:00:00.000Z",
        publishedAt: "2026-09-08T10:00:08.000Z"
      })],
      fetchedAt: "2026-09-13T12:00:00.000Z",
      supabaseClient: createSupabaseInsertMock(insertedRows),
      allowListingsWithoutCreatedAtFirst: true
    });

    expect(insertedRows[0].published_at).toBe("2026-09-08T10:00:08.000Z");
    expect(insertedRows[0].created_at_first).toBe("2026-09-12T10:00:00.000Z");
  });

  it("does not fall back to createdAtFirst for CustoJusto published_at", async () => {
    const insertedRows = [];
    await executeProviderSync({
      providerName: "custojusto",
      empresaId: "empresa-1",
      listings: [baseListing("CJ124", {
        source: "custojusto",
        createdAtFirst: "2026-09-12T10:00:00.000Z",
        publishedAt: null
      })],
      fetchedAt: "2026-09-13T12:00:00.000Z",
      supabaseClient: createSupabaseInsertMock(insertedRows),
      allowListingsWithoutCreatedAtFirst: true
    });

    expect(insertedRows[0].published_at).toBeNull();
    expect(insertedRows[0].created_at_first).toBe("2026-09-12T10:00:00.000Z");
  });

  it("preserves the detailed location when district is also available", async () => {
    const insertedRows = [];
    await executeProviderSync({
      providerName: "olx",
      empresaId: "empresa-1",
      listings: [baseListing("IDJ129", { location: "Cacém E São Marcos", district: "Lisboa" })],
      fetchedAt: "2026-09-13T12:00:00.000Z",
      supabaseClient: createSupabaseInsertMock(insertedRows),
      allowListingsWithoutCreatedAtFirst: true
    });

    expect(insertedRows[0]).toMatchObject({ location: "Cacém E São Marcos", district: "Lisboa" });
  });

  it("converts Ontem and leaves unknown relative text unpublished", async () => {
    const insertedRows = [];
    await executeProviderSync({
      providerName: "olx",
      empresaId: "empresa-1",
      listings: [
        baseListing("IDJ124", { publishedAt: "Ontem às 09:37", isPrivateOwner: true }),
        baseListing("IDJ125", { publishedAt: "há 3 dias", isPrivateOwner: false })
      ],
      fetchedAt: "2026-09-13T12:00:00.000Z",
      supabaseClient: createSupabaseInsertMock(insertedRows),
      allowListingsWithoutCreatedAtFirst: true
    });

    expect(insertedRows[0].published_at).toBe("2026-09-12T08:37:00.000Z");
    expect(insertedRows[0].created_at_first).toBeNull();
    expect(insertedRows[1].published_at).toBeNull();
    expect(insertedRows[1].created_at_first).toBeNull();
  });

  it("counts only explicit owner classifications", async () => {
    const insertedRows = [];
    const result = await executeProviderSync({
      providerName: "olx",
      empresaId: "empresa-1",
      listings: [
        baseListing("IDJ126", { isPrivateOwner: true }),
        baseListing("IDJ127", { isPrivateOwner: false }),
        baseListing("IDJ128", { isPrivateOwner: null })
      ],
      fetchedAt: "2026-09-13T12:00:00.000Z",
      supabaseClient: createSupabaseInsertMock(insertedRows),
      allowListingsWithoutCreatedAtFirst: true
    });

    expect(result.analyzedPrivateOwners).toBe(1);
    expect(result.analyzedAgencies).toBe(1);
    expect(insertedRows.map((row) => row.is_private_owner)).toEqual([true, false, null]);
  });

  it("reuses preloaded existing IDs without inserting them again", async () => {
    const insertedRows = [];
    const result = await executeProviderSync({
      providerName: "olx",
      empresaId: "empresa-1",
      listings: [baseListing("IDJexisting", { existingProviderLeadId: "lead-existing" })],
      fetchedAt: "2026-09-13T12:00:00.000Z",
      supabaseClient: createSupabaseInsertMock(insertedRows),
      allowListingsWithoutCreatedAtFirst: true
    });

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(insertedRows).toEqual([]);
  });
});