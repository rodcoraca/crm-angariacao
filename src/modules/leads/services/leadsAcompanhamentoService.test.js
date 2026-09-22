import { carregarAcompanhamentoLeads } from "./leadsAcompanhamentoService";
import { fetchLeadsAcompanhamento, fetchLeadsAcompanhamentoGlobalKpis } from "../repositories/leadsAcompanhamentoRepository";
import { resolveEmpresaId } from "../../../utils/empresaScope";

jest.mock("../repositories/leadsAcompanhamentoRepository", () => ({
  fetchLeadsAcompanhamento: jest.fn(),
  fetchLeadsAcompanhamentoGlobalKpis: jest.fn()
}));

jest.mock("../../../utils/empresaScope", () => ({
  resolveEmpresaId: jest.fn()
}));

describe("servico de Acompanhamento de Leads", () => {
  beforeEach(() => {
    resolveEmpresaId.mockResolvedValue("empresa-1");
    fetchLeadsAcompanhamento.mockResolvedValue({ data: { kpis: {} }, error: null });
    fetchLeadsAcompanhamentoGlobalKpis.mockResolvedValue({ data: { kpis: {}, users: [] }, error: null });
  });

  it("envia o inicio inclusivo e o fim exclusivo em UTC", async () => {
    await carregarAcompanhamentoLeads({
      user: { perfil_id: "utilizador-1" },
      filtros: { dateFrom: "2026-09-01", dateTo: "2026-09-30" },
      page: 1,
      pageSize: 25
    });

    expect(fetchLeadsAcompanhamento).toHaveBeenCalledWith(expect.objectContaining({
      dateFrom: "2026-09-01T00:00:00.000Z",
      dateTo: "2026-10-01T00:00:00.000Z",
      agentId: undefined
    }));
    expect(fetchLeadsAcompanhamentoGlobalKpis).toHaveBeenCalledWith(expect.objectContaining({ agentId: undefined }));
  });
});
