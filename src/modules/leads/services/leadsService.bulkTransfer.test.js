jest.mock("../../../utils/empresaScope.js", () => ({
  resolveEmpresaId: jest.fn(() => "empresa-1"),
  hasEmpresaId: jest.fn(() => true),
  warnMissingEmpresaId: jest.fn(),
  buildMissingEmpresaError: jest.fn(() => new Error("Empresa em falta."))
}));

import { transferirLeadsEmLote } from "./leadsService";

describe("transferirLeadsEmLote", () => {
  it("reporta transferências bem-sucedidas e parciais com erro por lead", async () => {
    const transferFn = jest.fn(async ({ leadId }) => {
      if (leadId === "lead-2") {
        return { error: new Error("Sem permissão para transferir esta lead.") };
      }

      return { error: null, data: { id: leadId } };
    });

    const result = await transferirLeadsEmLote({
      leadIds: ["lead-1", "lead-2", "lead-3"],
      agenteId: "agent-9",
      user: { id: "user-1", empresa_id: "empresa-1" },
      transferFn
    });

    expect(result.totalSelecionado).toBe(3);
    expect(result.totalTransferido).toBe(2);
    expect(result.totalFalhado).toBe(1);
    expect(result.transferidas.map((lead) => lead.id)).toEqual(["lead-1", "lead-3"]);
    expect(result.falhadas[0].leadId).toBe("lead-2");
    expect(result.falhadas[0].error.message).toBe("Sem permissão para transferir esta lead.");
    expect(transferFn).toHaveBeenCalledTimes(3);
    expect(transferFn).toHaveBeenNthCalledWith(1, expect.objectContaining({
      leadId: "lead-1",
      agenteId: "agent-9",
      origem: "DashboardLeadsBulkTransfer"
    }));
  });

  it("retorna zero quando não existem leads para transferir", async () => {
    const transferFn = jest.fn();

    const result = await transferirLeadsEmLote({
      leadIds: [],
      agenteId: "agent-9",
      user: { id: "user-1", empresa_id: "empresa-1" },
      transferFn
    });

    expect(result.totalSelecionado).toBe(0);
    expect(result.totalTransferido).toBe(0);
    expect(result.totalFalhado).toBe(0);
    expect(transferFn).not.toHaveBeenCalled();
  });
});
