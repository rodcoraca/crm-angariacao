import { mapProviderLeadToOpportunity } from "./RadarRepository";
import { formatPublishedDate } from "../utils/radarUtils";

describe("mapProviderLeadToOpportunity published_at", () => {
  it("uses published_at for Publicado em without replacing created_at_first", () => {
    const publishedAt = "2026-09-08T11:00:08.000Z";
    const createdAtFirst = "2026-01-01T10:00:00.000Z";
    const opportunity = mapProviderLeadToOpportunity({
      provider: "imovirtual",
      title: "Apartamento",
      published_at: publishedAt,
      created_at_first: createdAtFirst
    });

    expect(opportunity.published_at).toBe(publishedAt);
    expect(opportunity.created_at_first).toBe(createdAtFirst);
    expect(formatPublishedDate(opportunity.published_at)).toBe("08/09/2026 12:00");
    expect(formatPublishedDate(opportunity.published_at)).not.toBe(formatPublishedDate(createdAtFirst));
  });

  it("shows the placeholder for CustoJusto when published_at is absent", () => {
    const createdAtFirst = "2026-01-01T10:00:00.000Z";
    const opportunity = mapProviderLeadToOpportunity({
      provider: "custojusto",
      title: "Moradia",
      published_at: null,
      created_at_first: createdAtFirst
    });

    expect(opportunity.published_at).toBeNull();
    expect(opportunity.created_at_first).toBe(createdAtFirst);
    expect(formatPublishedDate(opportunity.published_at)).toBe("—");
  });

  it("keeps CustoJusto published_at when it is available", () => {
    const publishedAt = "2026-09-08T11:00:08.000Z";
    const createdAtFirst = "2026-01-01T10:00:00.000Z";
    const opportunity = mapProviderLeadToOpportunity({
      provider: "custojusto",
      title: "Moradia",
      published_at: publishedAt,
      created_at_first: createdAtFirst
    });

    expect(opportunity.published_at).toBe(publishedAt);
    expect(opportunity.created_at_first).toBe(createdAtFirst);
  });

  it("uses OLX published_at when created_at_first is null", () => {
    const publishedAt = "2026-09-13T08:37:00.000Z";
    const opportunity = mapProviderLeadToOpportunity({
      provider: "olx",
      title: "Apartamento",
      published_at: publishedAt,
      created_at_first: null
    });

    expect(opportunity.published_at).toBe(publishedAt);
    expect(opportunity.created_at_first).toBeNull();
    expect(formatPublishedDate(opportunity.published_at)).toBe("13/09/2026 09:37");
  });

  it("marks OLX Para o topo from raw_data without changing published_at", () => {
    const publishedAt = "2026-09-13T10:41:00.000Z";
    const opportunity = mapProviderLeadToOpportunity({
      provider: "olx",
      title: "Apartamento",
      published_at: publishedAt,
      raw_data: { publishedAt: "Para o topo hoje às 11:41" }
    });

    expect(opportunity.published_at).toBe(publishedAt);
    expect(opportunity.published_at_source).toBe("promotion");
    expect(opportunity.published_at).not.toContain("*");
  });

  it("does not mark CustoJusto or Imovirtual promotion references", () => {
    for (const provider of ["custojusto", "imovirtual"]) {
      const opportunity = mapProviderLeadToOpportunity({
        provider,
        published_at: "2026-09-13T10:41:00.000Z",
        raw_data: { publishedAt: "Para o topo hoje às 11:41" }
      });

      expect(opportunity.published_at_source).toBeNull();
    }
  });

  it("keeps OLX published_at null when it is absent", () => {
    const opportunity = mapProviderLeadToOpportunity({
      provider: "olx",
      title: "Apartamento",
      published_at: null,
      created_at_first: null
    });

    expect(opportunity.published_at).toBeNull();
    expect(formatPublishedDate(opportunity.published_at)).toBe("—");
  });

  it("always uses the correct placeholder encoding", () => {
    expect(formatPublishedDate(null)).toBe("—");
    expect(formatPublishedDate("â€”")).toBe("—");
  });

  it("keeps the mapped score unchanged", () => {
    const opportunity = mapProviderLeadToOpportunity({
      provider: "custojusto",
      score: 75,
      published_at: null,
      created_at_first: "2026-01-01T10:00:00.000Z"
    });

    expect(opportunity.score).toBe(75);
  });
});
