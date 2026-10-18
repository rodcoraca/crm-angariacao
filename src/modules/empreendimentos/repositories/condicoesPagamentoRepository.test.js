import {
  deleteCondicaoPagamento,
  fetchCondicoesPagamentoByEmpreendimento,
  updateCondicaoPagamento
} from "./condicoesPagamentoRepository";
import { supabase } from "../../../supabase";

const mockQuery = {
  select: jest.fn(function select() { return this; }),
  eq: jest.fn(function eq() { return this; }),
  order: jest.fn(function order() { return this; }),
  update: jest.fn(function update() { return this; }),
  delete: jest.fn(function deleteQuery() { return this; })
};

jest.mock("../../../supabase", () => ({
  supabase: {
    from: jest.fn(() => mockQuery)
  }
}));

describe("condicoesPagamentoRepository", () => {
  beforeEach(() => {
    Object.values(mockQuery).forEach((method) => method.mockClear());
    mockQuery.select.mockImplementation(() => mockQuery);
    mockQuery.eq.mockImplementation(() => mockQuery);
    mockQuery.order.mockImplementation(() => mockQuery);
    mockQuery.update.mockImplementation(() => mockQuery);
    mockQuery.delete.mockImplementation(() => mockQuery);
    supabase.from.mockClear();
    supabase.from.mockReturnValue(mockQuery);
  });

  it("filtra pela empresa do empreendimento pai, sem consultar empresa_id na tabela de condições", () => {
    fetchCondicoesPagamentoByEmpreendimento("empreendimento-1", "empresa-1");

    expect(mockQuery.select).toHaveBeenCalledWith("*, empreendimentos!inner(empresa_id)");
    expect(mockQuery.eq).toHaveBeenCalledWith("empreendimento_id", "empreendimento-1");
    expect(mockQuery.eq).toHaveBeenCalledWith("empreendimentos.empresa_id", "empresa-1");
    expect(mockQuery.eq).not.toHaveBeenCalledWith("empresa_id", "empresa-1");
  });

  it("mantém o scope relacional nas alterações e eliminações", () => {
    updateCondicaoPagamento("condicao-1", { valor: 10 }, "empresa-1");
    deleteCondicaoPagamento("condicao-1", "empresa-1");

    expect(mockQuery.eq).toHaveBeenCalledWith("empreendimentos.empresa_id", "empresa-1");
    expect(mockQuery.eq).not.toHaveBeenCalledWith("empresa_id", "empresa-1");
  });
});
