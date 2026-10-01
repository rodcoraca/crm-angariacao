jest.mock("../repositories/leadsRepository", () => ({
  fetchLeadById: jest.fn(),
  fetchLeadByTelefone: jest.fn(),
  fetchLeadByTelefoneExcludingId: jest.fn(),
  fetchLeadsByTipo: jest.fn(),
  fetchDashboardLeads: jest.fn(),
  fetchProviderLeadByCrmLeadId: jest.fn(),
  insertLead: jest.fn(),
  updateLeadById: jest.fn()
}));

jest.mock("../repositories/leadLembretesRepository", () => ({
  fetchLeadLembreteAtivo: jest.fn()
}));

jest.mock("../../audit/services", () => ({
  auditMutation: jest.fn((eventType, execute) => execute())
}));

const {
  fetchLeadById,
  fetchProviderLeadByCrmLeadId
} = require("../repositories/leadsRepository");
const { fetchLeadLembreteAtivo } = require("../repositories/leadLembretesRepository");
const { carregarFichaLead } = require("./leadsService");
const { resolveRadarLeadImportInfo } = require("../../radar/contracts/radarLeadMetadata");

const user = {
  id: "auth-user-1",
  perfil_id: "user-1",
  empresa_id: "empresa-1",
  permissoes: { __perfil: "administrador" }
};

const baseLead = {
  id: "lead-1",
  nome: "Maria",
  telefone: "351912345678",
  telefone_nao_disponivel: false,
  tipo: "morno",
  origem: "Imovirtual",
  observacoes: "",
  status: "novo",
  agente_id: "user-1",
  data_visita: null,
  hora_visita: null,
  local_visita: null,
  status_visita: null
};

describe("carregarFichaLead provider_leads wiring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchLeadLembreteAtivo.mockResolvedValue({ data: null, error: null });
  });

  test("attaches provider_leads data and respects empresa_id when the lead was imported via Radar", async () => {
    fetchLeadById.mockResolvedValue({ data: { ...baseLead }, error: null });
    fetchProviderLeadByCrmLeadId.mockResolvedValue({
      data: {
        crm_lead_id: "lead-1",
        provider_leads: {
          url: "https://example.com/imovel/persisted",
          provider: "Imovirtual",
          external_id: "LIST-123",
          imported_at: "2026-09-20T08:00:00.000Z"
        }
      },
      error: null
    });

    const result = await carregarFichaLead("lead-1", user);

    expect(result.error).toBeNull();
    expect(fetchProviderLeadByCrmLeadId).toHaveBeenCalledWith("lead-1", "empresa-1");
    expect(result.providerLead).toEqual(expect.objectContaining({ url: "https://example.com/imovel/persisted" }));

    const importInfo = resolveRadarLeadImportInfo(result.lead, result.form, result.providerLead);
    expect(importInfo.url).toBe("https://example.com/imovel/persisted");
  });

  test("falls back to [RADAR_METADATA] when provider_leads has no matching listing", async () => {
    const observation = [
      "[RADAR_METADATA]",
      "Origem: Radar",
      "Portal: Imovirtual",
      "URL:",
      "https://example.com/imovel/metadata"
    ].join("\n");

    fetchLeadById.mockResolvedValue({ data: { ...baseLead, observacoes: observation }, error: null });
    fetchProviderLeadByCrmLeadId.mockResolvedValue({ data: null, error: null });

    const result = await carregarFichaLead("lead-1", user);

    expect(result.providerLead).toBeNull();

    const importInfo = resolveRadarLeadImportInfo(result.lead, result.form, result.providerLead);
    expect(importInfo.url).toBe("https://example.com/imovel/metadata");
  });

  test("returns no url when neither provider_leads nor metadata are available", async () => {
    fetchLeadById.mockResolvedValue({ data: { ...baseLead, origem: "Radar" }, error: null });
    fetchProviderLeadByCrmLeadId.mockResolvedValue({ data: null, error: null });

    const result = await carregarFichaLead("lead-1", user);

    const importInfo = resolveRadarLeadImportInfo(result.lead, result.form, result.providerLead);
    expect(importInfo.isRadarImported).toBe(true);
    expect(importInfo.url).toBe("");
  });

  test("does not surface Radar info for a non-Radar lead", async () => {
    fetchLeadById.mockResolvedValue({ data: { ...baseLead, origem: "Manual", observacoes: "Nota manual" }, error: null });
    fetchProviderLeadByCrmLeadId.mockResolvedValue({ data: null, error: null });

    const result = await carregarFichaLead("lead-1", user);

    const importInfo = resolveRadarLeadImportInfo(result.lead, result.form, result.providerLead);
    expect(importInfo).toBeNull();
  });

  test("does not fail the whole ficha load when provider_leads query errors", async () => {
    fetchLeadById.mockResolvedValue({ data: { ...baseLead }, error: null });
    fetchProviderLeadByCrmLeadId.mockResolvedValue({ data: null, error: new Error("boom") });

    const result = await carregarFichaLead("lead-1", user);

    expect(result.error).toBeNull();
    expect(result.providerLead).toBeNull();
  });
});
