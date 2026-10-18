import { act, renderHook, waitFor } from "@testing-library/react";
import { useEmpreendimentoCondicoesPagamento } from "./useEmpreendimentoCondicoesPagamento";
import { useAuthContext } from "../../auth/context";
import { usePermissions } from "../../auth/hooks/usePermissions";
import {
  fetchCondicoesPagamentoService,
  salvarCondicoesPagamentoService,
  excluirCondicaoPagamentoService
} from "../services/condicoesPagamentoService";
import { auditMutation } from "../../audit/services/auditService";
import { askConfirmation } from "../../../components/ui/feedbackBus";

jest.mock("../../auth/context", () => ({
  useAuthContext: jest.fn()
}));

jest.mock("../../auth/hooks/usePermissions", () => ({
  usePermissions: jest.fn()
}));

jest.mock("../services/condicoesPagamentoService", () => ({
  buildDefaultCondicoesPagamento: () => [
    { id: null, nome_etapa: "Entrada", ordem: 1, tipo_valor: "fixo", valor: "", negociavel: false, condicao_negociacao: "", isCustom: false },
    { id: null, nome_etapa: "CPCV", ordem: 2, tipo_valor: "percentual", valor: "", negociavel: false, condicao_negociacao: "", isCustom: false },
    { id: null, nome_etapa: "Escritura", ordem: 3, tipo_valor: "percentual", valor: "", negociavel: false, condicao_negociacao: "", isCustom: false }
  ],
  fetchCondicoesPagamentoService: jest.fn(),
  mapCondicaoPagamentoParaFormulario: (condicao) => ({ ...condicao, isCustom: false }),
  salvarCondicoesPagamentoService: jest.fn(),
  excluirCondicaoPagamentoService: jest.fn(),
  validarCondicaoPagamento: jest.fn(() => "")
}));

jest.mock("../../../components/ui/feedbackBus", () => ({
  askConfirmation: jest.fn(),
  notifyError: jest.fn(),
  notifySuccess: jest.fn()
}));

jest.mock("../../audit/services/auditService", () => ({
  auditMutation: jest.fn()
}));

describe("useEmpreendimentoCondicoesPagamento", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthContext.mockReturnValue({ user: { id: "user-1" } });
    usePermissions.mockReturnValue({ can: () => true });
  });

  it("carrega condições existentes associadas ao empreendimento", async () => {
    fetchCondicoesPagamentoService.mockResolvedValue({
      data: [{ id: "cond-1", empreendimento_id: "emp-1", nome_etapa: "Entrada", tipo_valor: "fixo", valor: 10000 }],
      error: null
    });

    const { result } = renderHook(() => useEmpreendimentoCondicoesPagamento({ empreendimentoId: "emp-1" }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchCondicoesPagamentoService).toHaveBeenCalledWith("emp-1");
    expect(result.current.condicoes).toHaveLength(3);
    expect(result.current.condicoes[0]).toEqual(expect.objectContaining({ id: "cond-1", nome_etapa: "Entrada", valor: 10000 }));
    expect(result.current.condicoes.map((condicao) => condicao.nome_etapa)).toEqual(["Entrada", "CPCV", "Escritura"]);
  });

  it("preserva etapas legítimas com o mesmo nome e tipos diferentes, sem adicionar predefinidas", async () => {
    fetchCondicoesPagamentoService.mockResolvedValue({
      data: [
        { id: "cond-1", empreendimento_id: "emp-1", nome_etapa: "Entrada", tipo_valor: "fixo", valor: 10000 },
        { id: "cond-2", empreendimento_id: "emp-1", nome_etapa: "Entrada", tipo_valor: "percentual", valor: 5 }
      ],
      error: null
    });

    const { result } = renderHook(() => useEmpreendimentoCondicoesPagamento({ empreendimentoId: "emp-1" }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.condicoes).toHaveLength(4);
    expect(result.current.condicoes.slice(0, 2).map((condicao) => condicao.tipo_valor)).toEqual(["fixo", "percentual"]);
  });

  it("identifica nomes repetidos e exige correção explícita antes de guardar", async () => {
    fetchCondicoesPagamentoService.mockResolvedValue({
      data: [
        { id: "cond-1", empreendimento_id: "emp-1", nome_etapa: "Entrada", tipo_valor: "percentual", valor: 9.99 },
        { id: "cond-2", empreendimento_id: "emp-1", nome_etapa: "Entrada", tipo_valor: "percentual", valor: 10 }
      ],
      error: null
    });

    const { result } = renderHook(() => useEmpreendimentoCondicoesPagamento({ empreendimentoId: "emp-1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.nomesEtapasDuplicados).toEqual(["entrada"]);
    await act(async () => {
      expect(await result.current.salvarCondicoes()).toBeNull();
    });
    expect(salvarCondicoesPagamentoService).not.toHaveBeenCalled();
  });

  it("não mapeia duas vezes o mesmo registo persistido", async () => {
    const row = { id: "cond-1", empreendimento_id: "emp-1", nome_etapa: "CPCV", tipo_valor: "percentual", valor: 20 };
    fetchCondicoesPagamentoService.mockResolvedValue({ data: [row, { ...row }], error: null });

    const { result } = renderHook(() => useEmpreendimentoCondicoesPagamento({ empreendimentoId: "emp-1" }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.condicoes).toHaveLength(3);
    expect(result.current.condicoes[0]).toEqual(expect.objectContaining({ id: "cond-1", nome_etapa: "CPCV" }));
    expect(result.current.condicoes.map((condicao) => condicao.nome_etapa)).toEqual(["CPCV", "Entrada", "Escritura"]);
  });

  it("permite adicionar a primeira condição quando não existem linhas", async () => {
    fetchCondicoesPagamentoService.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useEmpreendimentoCondicoesPagamento({ empreendimentoId: "emp-1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.adicionarEtapa();
    });

    expect(result.current.condicoes).toHaveLength(4);
    expect(result.current.condicoes[3]).toEqual(expect.objectContaining({ nome_etapa: "Reforço 1", ordem: 4 }));
    expect(result.current.condicoes[3].localId).toBe("local-condicao-1");
  });

  it("adiciona uma única etapa e editar uma linha não cria outra", async () => {
    fetchCondicoesPagamentoService.mockResolvedValue({
      data: [{ id: "cond-1", nome_etapa: "Entrada", tipo_valor: "percentual", valor: 9.99 }],
      error: null
    });

    const { result } = renderHook(() => useEmpreendimentoCondicoesPagamento({ empreendimentoId: "emp-1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.adicionarEtapa());
    expect(result.current.condicoes).toHaveLength(4);

    act(() => result.current.atualizarCondicao(0, "valor", "10"));
    expect(result.current.condicoes).toHaveLength(4);
    expect(result.current.condicoes[0].valor).toBe("10");
  });

  it.each(["entrada", " ENTRADA ", "Entrada", "cPcV", " Escritura "]) (
    "rejeita o nome reservado %s numa nova etapa",
    async (nomeReservado) => {
      fetchCondicoesPagamentoService.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useEmpreendimentoCondicoesPagamento({ empreendimentoId: "emp-1" }));
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => result.current.adicionarEtapa());
      act(() => result.current.atualizarCondicao(3, "nome_etapa", nomeReservado));

      await act(async () => {
        expect(await result.current.salvarCondicoes()).toBeNull();
      });

      expect(result.current.error).toBe("Este nome está reservado para uma etapa padrão. Escolha outro nome.");
      expect(salvarCondicoesPagamentoService).not.toHaveBeenCalled();
    }
  );

  it("adiciona uma etapa mesmo quando Escritura não existe", async () => {
    fetchCondicoesPagamentoService.mockResolvedValue({
      data: [
        { id: "cond-1", nome_etapa: "Entrada", tipo_valor: "percentual", valor: 10 },
        { id: "cond-2", nome_etapa: "CPCV", tipo_valor: "percentual", valor: 20 }
      ],
      error: null
    });

    const { result } = renderHook(() => useEmpreendimentoCondicoesPagamento({ empreendimentoId: "emp-1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.adicionarEtapa());

    expect(result.current.condicoes).toHaveLength(4);
    expect(result.current.condicoes[3]).toEqual(expect.objectContaining({ nome_etapa: "Reforço 1", ordem: 4 }));
  });

  it("impede remover etapas permanentes e permite remover uma personalizada", async () => {
    const rows = [
      { id: "cond-1", nome_etapa: "Entrada", tipo_valor: "percentual", valor: 10 },
      { id: "cond-2", nome_etapa: "CPCV", tipo_valor: "percentual", valor: 20 },
      { id: "cond-3", nome_etapa: "Escritura", tipo_valor: "percentual", valor: 70 },
      { id: "cond-4", nome_etapa: "Reforço", tipo_valor: "percentual", valor: 5 }
    ];
    fetchCondicoesPagamentoService
      .mockResolvedValueOnce({ data: rows, error: null })
      .mockResolvedValueOnce({ data: rows.slice(0, 3), error: null });
    excluirCondicaoPagamentoService.mockResolvedValue({ data: true, error: null });
    salvarCondicoesPagamentoService.mockResolvedValue({ data: [], error: null });
    askConfirmation.mockResolvedValue(true);
    auditMutation.mockImplementation(async (_event, action) => action());

    const { result } = renderHook(() => useEmpreendimentoCondicoesPagamento({ empreendimentoId: "emp-1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.atualizarCondicao(0, "valor", "11"));
    expect(result.current.condicoes).toHaveLength(4);

    await act(async () => {
      await result.current.removerEtapa(0);
    });

    expect(excluirCondicaoPagamentoService).not.toHaveBeenCalled();
    expect(result.current.condicoes).toHaveLength(4);

    await act(async () => {
      await result.current.removerEtapa(3);
    });

    expect(excluirCondicaoPagamentoService).toHaveBeenCalledTimes(1);
    expect(result.current.condicoes).toHaveLength(3);

    await act(async () => {
      await result.current.salvarCondicoes();
    });

    expect(salvarCondicoesPagamentoService).toHaveBeenCalledWith({
      empreendimentoId: "emp-1",
      condicoes: expect.arrayContaining([
        expect.objectContaining({ id: "cond-1", valor: "11" }),
        expect.objectContaining({ id: "cond-2" }),
        expect.objectContaining({ id: "cond-3" })
      ]),
      currentUser: { id: "user-1" }
    });
    expect(result.current.condicoes).toHaveLength(3);
    expect(fetchCondicoesPagamentoService).toHaveBeenCalledTimes(2);
  });

  it("mantém a mesma quantidade depois de guardar e recarregar", async () => {
    const rows = [
      { id: "cond-1", nome_etapa: "Entrada", tipo_valor: "percentual", valor: 9.99 },
      { id: "cond-2", nome_etapa: "CPCV", tipo_valor: "percentual", valor: 10 },
      { id: "cond-3", nome_etapa: "Escritura", tipo_valor: "percentual", valor: 70 }
    ];
    fetchCondicoesPagamentoService
      .mockResolvedValueOnce({ data: rows, error: null })
      .mockResolvedValueOnce({ data: rows, error: null });
    salvarCondicoesPagamentoService.mockResolvedValue({ data: rows, error: null });
    auditMutation.mockImplementation(async (_event, action) => action());

    const { result } = renderHook(() => useEmpreendimentoCondicoesPagamento({ empreendimentoId: "emp-1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.totalPercentual).toBe(89.99);

    await act(async () => {
      await result.current.salvarCondicoes();
    });

    expect(result.current.condicoes).toHaveLength(3);
    expect(result.current.totalPercentual).toBe(89.99);
    expect(fetchCondicoesPagamentoService).toHaveBeenCalledTimes(2);
  });

  it("termina o loading e expõe o erro quando o carregamento falha", async () => {
    fetchCondicoesPagamentoService.mockRejectedValue(new Error("Falha de consulta"));

    const { result } = renderHook(() => useEmpreendimentoCondicoesPagamento({ empreendimentoId: "emp-1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.condicoes).toEqual([]);
    expect(result.current.error).toBe("Falha de consulta");
  });
});
