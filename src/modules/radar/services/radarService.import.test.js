import { RadarService } from "./radarService";
import { salvarLeadFluxo } from "../../leads/services";
import { supabase } from "../../../supabase";

jest.mock("../repositories/RadarRepository", () => ({
  RadarRepository: jest.fn().mockImplementation(() => ({ setProvider: jest.fn() }))
}));
jest.mock("../../leads/services", () => ({
  salvarLeadFluxo: jest.fn()
}));
jest.mock("./radarProviderConfig", () => ({
  buildConfiguredRadarProvider: jest.fn(() => ({}))
}));
jest.mock("../contracts/radarLeadMetadata", () => ({
  appendRadarMetadataBlockOnce: jest.fn((value) => value),
  buildRadarLeadMetadata: jest.fn((value) => ({
    provider: value.provider,
    externalId: value.externalId,
    url: value.url,
    publisherName: value.publisherName,
    publisherContact: value.publisherContact,
    publishedAt: value.publishedAt,
    capturedAt: value.capturedAt,
    score: value.score,
    status: value.status
  }))
}));
jest.mock("../../../supabase", () => ({
  supabase: { rpc: jest.fn() }
}));
jest.mock("../../audit/services", () => ({
  auditMutation: jest.fn()
}));
jest.mock("../../../utils/empresaScope.js", () => ({
  buildMissingEmpresaError: jest.fn(() => new Error("empresa_id em falta")),
  hasEmpresaId: jest.fn((value) => Boolean(value)),
  resolveEmpresaId: jest.fn(async () => "company-id"),
  warnMissingEmpresaId: jest.fn()
}));

const opportunity = {
  id: "provider-lead-id",
  origem: "olx",
  titulo: "Apartamento T2",
  anunciante_nome: "Signalda Neto",
  id_externo: "IDJCBbw",
  url_original: "https://example.test/ad",
  score: 0
};
const user = { id: "user-id", perfil_id: "user-id", empresa_id: "company-id" };

describe("RadarService importação idempotente", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("reserva e conclui uma importação OLX", async () => {
    supabase.rpc
      .mockResolvedValueOnce({ data: { status: "claimed" }, error: null })
      .mockResolvedValueOnce({ data: { status: "completed" }, error: null });
    salvarLeadFluxo.mockResolvedValue({ id: "crm-lead-id" });

    const service = new RadarService({});
    const result = await service.importOpportunityToLeads(opportunity, user);

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, "radar_claim_lead_import", expect.objectContaining({
      p_empresa_id: "company-id",
      p_provider_lead_id: "provider-lead-id"
    }));
    expect(salvarLeadFluxo).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, "radar_complete_lead_import", expect.objectContaining({
      p_crm_lead_id: "crm-lead-id"
    }));
  });

  test("reconcilia uma Lead já criada quando a primeira conclusão falha", async () => {
    supabase.rpc
      .mockResolvedValueOnce({ data: { status: "claimed" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "falha transitória" } })
      .mockResolvedValueOnce({
        data: { status: "already_imported", crm_lead_id: "crm-lead-id", reconciled: true },
        error: null
      });
    salvarLeadFluxo.mockResolvedValue({ id: "crm-lead-id" });

    const service = new RadarService({});
    const result = await service.importOpportunityToLeads(opportunity, user);

    expect(result).toEqual({
      ok: true,
      message: "Importação reconciliada: a Lead já existia no CRM."
    });
    expect(salvarLeadFluxo).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledTimes(3);
    expect(supabase.rpc).toHaveBeenNthCalledWith(3, "radar_claim_lead_import", expect.any(Object));
    expect(supabase.rpc).not.toHaveBeenCalledWith("radar_fail_lead_import", expect.anything());
  });

  test("não liberta a reserva quando o resultado da criação é incerto", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: { status: "claimed" }, error: null });
    salvarLeadFluxo.mockResolvedValue({ error: { message: "falha após a mutação" } });

    const service = new RadarService({});
    const result = await service.importOpportunityToLeads(opportunity, user);

    expect(result.ok).toBe(false);
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith("radar_claim_lead_import", expect.any(Object));
    expect(supabase.rpc).not.toHaveBeenCalledWith("radar_fail_lead_import", expect.anything());
  });

  test("não cria a Lead quando a reserva informa que já está em processamento", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: { status: "processing" }, error: null });

    const service = new RadarService({});
    const result = await service.importOpportunityToLeads(opportunity, user);

    expect(result.ok).toBe(false);
    expect(result.processing).toBe(true);
    expect(salvarLeadFluxo).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });
});
