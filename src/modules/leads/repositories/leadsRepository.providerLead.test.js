const mockQuery = {
  select: jest.fn(function select() { return this; }),
  eq: jest.fn(function eq() { return this; }),
  maybeSingle: jest.fn(function maybeSingle() { return this; })
};

jest.mock("../../../supabase", () => ({
  supabase: {
    from: jest.fn(() => mockQuery)
  }
}));

const { supabase } = require("../../../supabase");
const { fetchProviderLeadByCrmLeadId } = require("./leadsRepository");

describe("fetchProviderLeadByCrmLeadId", () => {
  beforeEach(() => {
    mockQuery.select.mockClear().mockImplementation(function select() { return this; });
    mockQuery.eq.mockClear().mockImplementation(function eq() { return this; });
    mockQuery.maybeSingle.mockClear().mockImplementation(function maybeSingle() { return this; });
    supabase.from.mockClear();
    supabase.from.mockReturnValue(mockQuery);
  });

  it("queries empresa_provider_listings filtered by crm_lead_id and empresa_id", () => {
    fetchProviderLeadByCrmLeadId("lead-1", "empresa-1");

    expect(supabase.from).toHaveBeenCalledWith("empresa_provider_listings");
    expect(mockQuery.eq).toHaveBeenCalledWith("crm_lead_id", "lead-1");
    expect(mockQuery.eq).toHaveBeenCalledWith("empresa_id", "empresa-1");
  });

  it("embeds the related provider_leads fields in the select", () => {
    fetchProviderLeadByCrmLeadId("lead-1", "empresa-1");

    expect(mockQuery.select).toHaveBeenCalledWith(
      expect.stringContaining("provider_leads(url, provider, external_id, imported_at, published_at, score, status)")
    );
  });

  it("does not scope by empresa_id when none is provided", () => {
    fetchProviderLeadByCrmLeadId("lead-1", null);

    expect(mockQuery.eq).toHaveBeenCalledWith("crm_lead_id", "lead-1");
    expect(mockQuery.eq).not.toHaveBeenCalledWith("empresa_id", expect.anything());
  });
});
