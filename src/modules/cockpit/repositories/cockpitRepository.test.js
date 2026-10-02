import { queryAgendaLembretesFuturos, queryAgendaLembretesHoje } from "./cockpitRepository";
import { supabase } from "../../../supabase";

const mockQuery = {
  select: jest.fn(function select() { return this; }),
  eq: jest.fn(function eq() { return this; }),
  gte: jest.fn(function gte() { return this; }),
  lte: jest.fn(function lte() { return this; }),
  order: jest.fn(function order() { return this; }),
  limit: jest.fn(function limit() { return this; })
};

jest.mock("../../../supabase", () => ({
  supabase: {
    from: jest.fn(() => mockQuery)
  }
}));

describe("queryAgendaLembretesHoje", () => {
  beforeEach(() => {
    mockQuery.select.mockClear().mockImplementation(function select() { return this; });
    mockQuery.eq.mockClear().mockImplementation(function eq() { return this; });
    mockQuery.order.mockClear().mockImplementation(function order() { return this; });
    mockQuery.limit.mockClear().mockImplementation(function limit() { return this; });
    supabase.from.mockClear();
    supabase.from.mockReturnValue(mockQuery);
  });

  it("inclui empresa e criado_por no scope do utilizador A", () => {
    queryAgendaLembretesHoje("id,lead_id", "2026-09-17", 5, "empresa-1", "usuario-a");

    expect(mockQuery.eq).toHaveBeenCalledWith("empresa_id", "empresa-1");
    expect(mockQuery.eq).toHaveBeenCalledWith("criado_por", "usuario-a");
  });

  it("usa o perfil B quando a query é criada para B", () => {
    queryAgendaLembretesHoje("id,lead_id", "2026-09-17", 5, "empresa-1", "usuario-b");

    expect(mockQuery.eq).toHaveBeenCalledWith("criado_por", "usuario-b");
    expect(mockQuery.eq).not.toHaveBeenCalledWith("criado_por", "usuario-a");
  });
});

describe("queryAgendaLembretesFuturos", () => {
  beforeEach(() => {
    mockQuery.select.mockClear().mockImplementation(function select() { return this; });
    mockQuery.eq.mockClear().mockImplementation(function eq() { return this; });
    mockQuery.gte.mockClear().mockImplementation(function gte() { return this; });
    mockQuery.lte.mockClear().mockImplementation(function lte() { return this; });
    mockQuery.order.mockClear().mockImplementation(function order() { return this; });
    mockQuery.limit.mockClear().mockImplementation(function limit() { return this; });
    supabase.from.mockClear();
    supabase.from.mockReturnValue(mockQuery);
  });

  it("mantem tenant, utilizador e janela futura na query", () => {
    queryAgendaLembretesFuturos("id,lead_id", "2026-09-23", "2026-10-22", 100, "empresa-1", "usuario-a");

    expect(mockQuery.eq).toHaveBeenCalledWith("empresa_id", "empresa-1");
    expect(mockQuery.eq).toHaveBeenCalledWith("criado_por", "usuario-a");
    expect(mockQuery.gte).toHaveBeenCalledWith("data_lembrete", "2026-09-23");
    expect(mockQuery.lte).toHaveBeenCalledWith("data_lembrete", "2026-10-22");
  });

  it("permite todos os lembretes futuros sem limite superior de data ou quantidade", () => {
    queryAgendaLembretesFuturos("id,lead_id", "2026-09-23", null, null, "empresa-1", "usuario-a");

    expect(mockQuery.eq).toHaveBeenCalledWith("empresa_id", "empresa-1");
    expect(mockQuery.eq).toHaveBeenCalledWith("criado_por", "usuario-a");
    expect(mockQuery.gte).toHaveBeenCalledWith("data_lembrete", "2026-09-23");
    expect(mockQuery.lte).not.toHaveBeenCalled();
    expect(mockQuery.limit).not.toHaveBeenCalled();
  });
});
