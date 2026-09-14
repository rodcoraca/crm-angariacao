import { filtrarLeadsDashboard } from "./leadsViewModel";

describe("lead dashboard status filter", () => {
  it("filters by commercial status without mixing migrated leads with losses", () => {
    const leads = [
      { id: "converted", nome: "A", status: "convertido" },
      { id: "lost", nome: "B", status: "nao_evoluiu" },
      { id: "migrated", nome: "C", status: "migrado" }
    ];

    expect(filtrarLeadsDashboard(leads, "", "", "", "convertido").map((lead) => lead.id)).toEqual(["converted"]);
    expect(filtrarLeadsDashboard(leads, "", "", "", "migrado").map((lead) => lead.id)).toEqual(["migrated"]);
  });
});