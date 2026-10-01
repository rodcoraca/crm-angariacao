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

jest.mock("./leadLembretesService", () => ({
  alterarLeadLembrete: jest.fn(),
  carregarHistoricoLeadLembretes: jest.fn(),
  concluirLeadLembrete: jest.fn(),
  criarLeadLembrete: jest.fn()
}));

jest.mock("../../audit/services", () => ({
  auditMutation: jest.fn((eventType, execute) => execute())
}));

jest.mock("./leadPermissionService", () => ({
  canManageLead: jest.fn(() => true),
  canTransferLead: jest.fn(() => true)
}));

const {
  fetchLeadById,
  fetchLeadByTelefoneExcludingId,
  fetchProviderLeadByCrmLeadId,
  updateLeadById
} = require("../repositories/leadsRepository");
const { fetchLeadLembreteAtivo } = require("../repositories/leadLembretesRepository");
const { canManageLead } = require("./leadPermissionService");
const { auditMutation } = require("../../audit/services");
const { carregarFichaLead, salvarFichaLead } = require("./leadsService");
const { resolveRadarLeadImportInfo } = require("../../radar/contracts/radarLeadMetadata");

const user = {
  id: "auth-user-1",
  perfil_id: "user-1",
  empresa_id: "empresa-1",
  permissoes: { __perfil: "administrador" }
};

const radarMetadataBlock = [
  "[RADAR_METADATA]",
  "Origem: Radar",
  "Portal: Imovirtual",
  "ID Externo: LIST-123",
  "Anunciante: Maria",
  "Contacto: 351912345678",
  "Publicado em: 27/09/2026",
  "Recolhido em: 28/09/2026",
  "Score Radar: 88",
  "Estado Radar: ativo",
  "URL:",
  "https://example.com/imovel/123"
].join("\n");

const radarObservation = [
  "Importado via Radar (2026-09-28T11:12:13.000Z)",
  "Título: Apartamento T2",
  "Local: Lisboa, Lisboa",
  "Preço: 250000",
  "",
  radarMetadataBlock
].join("\n");

const baseLead = {
  id: "lead-1",
  nome: "Maria",
  telefone: "351912345678",
  telefone_nao_disponivel: false,
  tipo: "morno",
  origem: "Imovirtual",
  observacoes: radarObservation,
  status: "novo",
  agente_id: "user-1",
  data_visita: null,
  hora_visita: null,
  local_visita: null,
  status_visita: null
};

describe("leadsService Radar metadata preservation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auditMutation.mockImplementation((eventType, execute) => execute());
    canManageLead.mockReturnValue(true);
    fetchLeadById.mockResolvedValue({ data: { ...baseLead }, error: null });
    fetchLeadByTelefoneExcludingId.mockResolvedValue({ data: null, error: null });
    fetchLeadLembreteAtivo.mockResolvedValue({ data: null, error: null });
    fetchProviderLeadByCrmLeadId.mockResolvedValue({ data: null, error: null });
    updateLeadById.mockResolvedValue({ data: { id: "lead-1" }, error: null });
  });

  async function loadForm() {
    const result = await carregarFichaLead("lead-1", user);
    expect(result.error).toBeNull();
    expect(result.form.observacoes).not.toContain("[RADAR_METADATA]");
    return result.form;
  }

  async function save(form) {
    const result = await salvarFichaLead({ leadId: "lead-1", form, user });
    expect(result.error).toBeNull();
    return updateLeadById.mock.calls.at(-1)[1];
  }

  test("preserves metadata when another lead field changes", async () => {
    const form = await loadForm();
    form.status = "em_contacto";

    const payload = await save(form);

    expect(payload.observacoes).toContain(radarMetadataBlock);
    expect(payload.observacoes.match(/\[RADAR_METADATA\]/g)).toHaveLength(1);
  });

  test("preserves metadata when editable observations change", async () => {
    const form = await loadForm();
    form.observacoes = "Nota comercial atualizada";

    const payload = await save(form);

    expect(payload.observacoes).toContain("Nota comercial atualizada");
    expect(payload.observacoes).toContain(radarMetadataBlock);
    expect(payload.observacoes.match(/\[RADAR_METADATA\]/g)).toHaveLength(1);
  });

  test("keeps the original URL and imported-at value available after saving", async () => {
    const form = await loadForm();
    form.observacoes = "Observação revista";

    const payload = await save(form);
    const importInfo = resolveRadarLeadImportInfo({ ...baseLead, observacoes: payload.observacoes });

    expect(importInfo.url).toBe("https://example.com/imovel/123");
    expect(importInfo.importedAt).toBe("2026-09-28T11:12:13.000Z");
  });

  test("resolveRadarLeadImportInfo continues to return the original URL after save", async () => {
    const form = await loadForm();
    form.nome = "Nome atualizado";

    const payload = await save(form);
    const importInfo = resolveRadarLeadImportInfo({ ...baseLead, observacoes: payload.observacoes });

    expect(importInfo).toEqual(expect.objectContaining({
      isRadarImported: true,
      provider: "Imovirtual",
      externalId: "LIST-123",
      url: "https://example.com/imovel/123"
    }));
  });

  test("does not duplicate the metadata block across successive saves", async () => {
    const firstForm = await loadForm();
    firstForm.observacoes = "Primeira alteração";
    const firstPayload = await save(firstForm);

    fetchLeadById.mockResolvedValue({
      data: { ...baseLead, observacoes: firstPayload.observacoes },
      error: null
    });
    const secondForm = await loadForm();
    secondForm.observacoes = "Segunda alteração";
    const secondPayload = await save(secondForm);

    expect(secondPayload.observacoes).toContain("Segunda alteração");
    expect(secondPayload.observacoes.match(/\[RADAR_METADATA\]/g)).toHaveLength(1);
  });

  test("keeps ordinary lead observations unchanged", async () => {
    fetchLeadById.mockResolvedValue({
      data: { ...baseLead, origem: "Manual", observacoes: "Nota anterior" },
      error: null
    });
    const form = await loadForm();
    form.observacoes = "Nota atualizada";

    const payload = await save(form);

    expect(payload.observacoes).toBe("Nota atualizada");
    expect(payload.observacoes).not.toContain("[RADAR_METADATA]");
  });

  test.each([
    "Importado via Radar (2026-09-28T11:12:13.000Z)\nNota sem metadata",
    "Importado via Radar (2026-09-28T11:12:13.000Z)\nNota anterior\n\n[RADAR_METADATA]\nbloco inválido"
  ])("does not generate metadata when stored Radar metadata is absent or invalid", async (observacoes) => {
    fetchLeadById.mockResolvedValue({
      data: { ...baseLead, observacoes },
      error: null
    });
    const form = await loadForm();
    form.observacoes = "Nota revista";

    const payload = await save(form);

    expect(payload.observacoes).not.toContain("[RADAR_METADATA]");
    expect(payload.observacoes).not.toContain("Origem: Radar");
  });
});