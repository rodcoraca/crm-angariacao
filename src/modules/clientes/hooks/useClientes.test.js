import { renderHook, waitFor } from "@testing-library/react";
import { useClientes } from "./useClientes";
import { useAuthContext } from "../../auth/context";
import { usePermissions } from "../../auth/hooks/usePermissions";
import {
  fetchClientesService,
  fetchUsuariosEmpresaService
} from "../services/clientesService";
import { fetchEmpreendimentosResumoService } from "../../empreendimentos/services/empreendimentosService";

jest.mock("../../auth/context", () => ({
  useAuthContext: jest.fn()
}));

jest.mock("../../auth/hooks/usePermissions", () => ({
  usePermissions: jest.fn()
}));

jest.mock("../services/clientesService", () => ({
  buildDefaultClienteForm: () => ({}),
  fetchClientesService: jest.fn(),
  fetchUsuariosEmpresaService: jest.fn(),
  mapClienteParaFormulario: jest.fn(),
  salvarClienteService: jest.fn(),
  excluirClienteService: jest.fn()
}));

jest.mock("../../empreendimentos/services/empreendimentosService", () => ({
  fetchEmpreendimentosResumoService: jest.fn()
}));

jest.mock("../../../components/ui/feedbackBus", () => ({
  askConfirmation: jest.fn(),
  notifyError: jest.fn(),
  notifySuccess: jest.fn()
}));

jest.mock("../../audit/services/auditService", () => ({
  auditMutation: jest.fn()
}));

describe("useClientes - carregamento", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthContext.mockReturnValue({ user: { id: "user-1" } });
    usePermissions.mockReturnValue({ can: () => true });
  });

  it("mantém clientes e utilizadores quando falha apenas o resumo de empreendimentos", async () => {
    fetchClientesService.mockResolvedValue({ data: [{ id: "cliente-1", nome_designacao: "Cliente" }] });
    fetchUsuariosEmpresaService.mockResolvedValue({ data: [{ id: "user-1", nome: "Utilizador" }] });
    fetchEmpreendimentosResumoService.mockRejectedValue(new Error("Resumo indisponível"));

    const { result } = renderHook(() => useClientes());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.clientes).toHaveLength(1);
    expect(result.current.usuariosEmpresa).toHaveLength(1);
    expect(result.current.empreendimentosPorCliente).toEqual({});
    expect(result.current.error).toBe("");
  });

  it("termina o loading e limpa o estado quando falha o carregamento principal", async () => {
    fetchClientesService.mockRejectedValue(new Error("Clientes indisponíveis"));
    fetchUsuariosEmpresaService.mockResolvedValue({ data: [{ id: "user-1" }] });
    fetchEmpreendimentosResumoService.mockResolvedValue({ data: [{ cliente_id: "cliente-1" }] });

    const { result } = renderHook(() => useClientes());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.clientes).toEqual([]);
    expect(result.current.usuariosEmpresa).toEqual([]);
    expect(result.current.empreendimentosPorCliente).toEqual({});
    expect(result.current.error).toBe("Clientes indisponíveis");
  });
});
