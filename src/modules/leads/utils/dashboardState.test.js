import {
  DEFAULT_DASHBOARD_FILTERS,
  getDashboardFiltersStorageKey,
  isAllFilteredLeadsSelected,
  readDashboardFilters,
  toggleLeadSelection,
  writeDashboardFilters
} from "./dashboardState";

describe("dashboardState", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("restaura filtros do storage por tenant e utilizador", () => {
    const filters = {
      busca: "Ana",
      filtroTipo: "quente",
      filtroStatus: "novo",
      filtroUtilizador: "agent-1"
    };

    writeDashboardFilters({ empresaId: "empresa-42", userId: "user-7", filters });

    expect(readDashboardFilters({ empresaId: "empresa-42", userId: "user-7" })).toEqual(filters);
    expect(readDashboardFilters({ empresaId: "empresa-42", userId: "user-8" })).toEqual(DEFAULT_DASHBOARD_FILTERS);
  });

  it("mantém valores padrão quando não existe estado persistido", () => {
    expect(readDashboardFilters({ empresaId: "empresa-1", userId: "user-a" })).toEqual(DEFAULT_DASHBOARD_FILTERS);
  });

  it("gera uma chave isolada por empresa e utilizador", () => {
    expect(getDashboardFiltersStorageKey({ empresaId: "empresa-1", userId: "user-1" })).toBe("osflow.leads.dashboard.filters.empresa-1.user-1");
  });

  it("toggleLeadSelection alterna seleção por lead id e select-all respeita as rows filtradas", () => {
    expect(toggleLeadSelection(["lead-1", "lead-2"], "lead-2")).toEqual(["lead-1"]);
    expect(toggleLeadSelection(["lead-1"], "lead-3")).toEqual(["lead-1", "lead-3"]);
    expect(isAllFilteredLeadsSelected([{ id: "lead-1" }, { id: "lead-2" }], ["lead-1", "lead-2"])).toBe(true);
    expect(isAllFilteredLeadsSelected([{ id: "lead-1" }, { id: "lead-2" }], ["lead-1"])).toBe(false);
  });
});
