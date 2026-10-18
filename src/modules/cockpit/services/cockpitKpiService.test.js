import { fetchCockpitKpis } from "./cockpitKpiService";
import * as cockpitRepository from "../repositories";
import * as empresaScope from "../../../utils/empresaScope.js";

jest.mock("../repositories", () => ({
  queryCountLeadsAtivas: jest.fn(),
  queryCountLeadsByStatus: jest.fn(),
  queryCountImoveisIncompletos: jest.fn(),
  queryCountAtividadesHoje: jest.fn(),
  queryCountEmpreendimentos: jest.fn(),
  queryCountUnidades: jest.fn(),
  queryCountImoveisNaoPublicitados: jest.fn()
}));

jest.mock("../../../utils/empresaScope.js", () => ({
  hasEmpresaId: (value) => Boolean(value),
  resolveEmpresaId: jest.fn()
}));

const mockQueryCountLeadsAtivas = cockpitRepository.queryCountLeadsAtivas;
const mockQueryCountLeadsByStatus = cockpitRepository.queryCountLeadsByStatus;
const mockQueryCountImoveisIncompletos = cockpitRepository.queryCountImoveisIncompletos;
const mockQueryCountAtividadesHoje = cockpitRepository.queryCountAtividadesHoje;
const mockQueryCountEmpreendimentos = cockpitRepository.queryCountEmpreendimentos;
const mockQueryCountUnidades = cockpitRepository.queryCountUnidades;
const mockQueryCountImoveisNaoPublicitados = cockpitRepository.queryCountImoveisNaoPublicitados;
const mockResolveEmpresaId = empresaScope.resolveEmpresaId;

function configureSuccessfulQueries() {
  [
    mockQueryCountLeadsAtivas,
    mockQueryCountLeadsByStatus,
    mockQueryCountImoveisIncompletos,
    mockQueryCountAtividadesHoje,
    mockQueryCountEmpreendimentos,
    mockQueryCountUnidades,
    mockQueryCountImoveisNaoPublicitados
  ].forEach((query) => query.mockResolvedValue({ count: 1, error: null }));
}

describe("fetchCockpitKpis - inventário", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureSuccessfulQueries();
    mockResolveEmpresaId.mockResolvedValue("empresa-1");
  });

  it("devolve as três contagens com o tenant autenticado", async () => {
    const result = await fetchCockpitKpis();

    expect(result["kpi-empreendimentos"]).toBe("1");
    expect(result["kpi-fracoes-registadas"]).toBe("1");
    expect(result["kpi-imoveis-nao-publicitados"]).toBe("1");
    expect(result["kpi-leads-ativas"]).toBe("1");
    expect(mockQueryCountEmpreendimentos).toHaveBeenCalledWith("empresa-1");
    expect(mockQueryCountUnidades).toHaveBeenCalledWith("empresa-1");
    expect(mockQueryCountImoveisNaoPublicitados).toHaveBeenCalledWith("empresa-1");
  });

  it("não consulta as novas fontes sem empresa_id", async () => {
    mockResolveEmpresaId.mockResolvedValue(null);

    const result = await fetchCockpitKpis();

    expect(result["kpi-empreendimentos"]).toBe("0");
    expect(result["kpi-fracoes-registadas"]).toBe("0");
    expect(result["kpi-imoveis-nao-publicitados"]).toBe("0");
    expect(mockQueryCountEmpreendimentos).not.toHaveBeenCalled();
    expect(mockQueryCountUnidades).not.toHaveBeenCalled();
    expect(mockQueryCountImoveisNaoPublicitados).not.toHaveBeenCalled();
  });

  it("mantém o erro quando uma contagem falha", async () => {
    mockQueryCountUnidades.mockResolvedValueOnce({ count: null, error: new Error("falha unidades") });

    await expect(fetchCockpitKpis()).rejects.toThrow("falha unidades");
  });
});
