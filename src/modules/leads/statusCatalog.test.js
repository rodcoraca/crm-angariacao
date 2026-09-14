import { getLeadStatusLabel, LEAD_STATUSES } from "./statusCatalog";

describe("lead commercial status catalog", () => {
  it("contains the eight official statuses and labels", () => {
    expect(LEAD_STATUSES.map((status) => status.value)).toEqual([
      "novo",
      "em_contacto",
      "em_acompanhamento",
      "agendamento",
      "proposta",
      "convertido",
      "nao_evoluiu",
      "migrado"
    ]);
    expect(getLeadStatusLabel("nao_evoluiu")).toBe("Não evoluiu");
  });
});