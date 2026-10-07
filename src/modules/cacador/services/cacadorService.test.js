import {
  getDaysOnMarket,
  getMaturityBand,
  getMaturityLabel,
  getResearchLabel
} from "./cacadorService";

describe("Caçador maturity rules", () => {
  it("uses provider publication date as the market start", () => {
    const now = new Date("2026-10-07T00:00:00.000Z");
    expect(getDaysOnMarket({
      created_at_first: "2026-08-23T00:00:00.000Z",
      market_first_seen_at: "2026-10-01T00:00:00.000Z"
    }, now)).toBe(45);
  });

  it("falls back to first observation when provider publication date is absent", () => {
    const now = new Date("2026-10-07T00:00:00.000Z");
    expect(getDaysOnMarket({
      market_first_seen_at: "2026-08-08T00:00:00.000Z"
    }, now)).toBe(60);
  });

  it("classifies 45-59 and 60+ independently", () => {
    expect(getMaturityBand(44)).toBe("menos_45");
    expect(getMaturityBand(45)).toBe("45_59");
    expect(getMaturityBand(59)).toBe("45_59");
    expect(getMaturityBand(60)).toBe("60_mais");
  });

  it("provides commercial labels", () => {
    expect(getMaturityLabel(45)).toBe("45 dias");
    expect(getMaturityLabel(60)).toBe("60+ dias");
    expect(getResearchLabel("active")).toBe("Ativo");
    expect(getResearchLabel("changed")).toBe("Alterado");
    expect(getResearchLabel("removed")).toBe("Removido");
  });
});
