import { formatAgentName, getActivityDetailLines, getDistinctLeadStatusCounts } from "./leadsAcompanhamentoFormatter";

describe("formatter de atividades do Acompanhamento", () => {
  it("converte uma alteracao de status em texto operacional", () => {
    expect(getActivityDetailLines({
      activity_type: "Alteração de status",
      previous_status: "novo",
      new_status: "em_contacto",
      details: {}
    })).toEqual([{ label: "Estado", value: "Novo → Em contacto" }]);
  });

  it("calcula acompanhadas por status atual distinto de novo", () => {
    expect(getDistinctLeadStatusCounts([
      { lead_id: "lead-1", current_status: "novo" },
      { lead_id: "lead-1", current_status: "em_contacto" },
      { lead_id: "lead-2", current_status: "proposta" }
    ])).toEqual({
      total: 2,
      newCount: 0,
      accompanied: 2,
      statusCounts: { em_contacto: 1, proposta: 1 }
    });
  });

  it("limita a identidade apresentada a nome e apelido", () => {
    expect(formatAgentName("Maria dos Santos Silva")).toBe("Maria dos");
    expect(formatAgentName("Sistema")).toBe("Sistema");
  });
});
