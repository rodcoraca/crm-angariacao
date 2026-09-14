import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Plantoes from "./Plantoes";

const mockListarUsuarios = jest.fn();
const mockListarEscalaPlantaoPorPeriodo = jest.fn();
const mockSubstituirEscalaPlantao = jest.fn();
const mockPublicarEscalaPlantao = jest.fn();
const mockUser = { id: "auth-1", empresa_id: "empresa-1" };

jest.mock("../theme/ThemeContext", () => ({
  useTheme: () => ({
    spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
    colors: { border: "#ddd", muted: "#777", success: "green", surface: "#fff", surfaceSoft: "#f5f5f5", text: "#111" },
    elevation: ["none", "0 1px 2px #ddd", "0 4px 10px #ddd"],
    borderRadius: { md: 8 },
    typography: { fontFamily: "sans-serif", body: { fontSize: 14 }, cardTitle: { fontSize: 16 } },
    layout: { padding: 16 },
  }),
}));
jest.mock("../modules/auth/context", () => ({ useAuthContext: () => ({ user: mockUser }) }));
jest.mock("../components/ui/feedbackBus", () => ({ notifyError: jest.fn(), notifySuccess: jest.fn() }));
jest.mock("../modules/users/services", () => ({ listarUsuarios: (...args) => mockListarUsuarios(...args) }));
jest.mock("../modules/servicos/services", () => ({
  listarEscalaPlantaoPorPeriodo: (...args) => mockListarEscalaPlantaoPorPeriodo(...args),
  substituirEscalaPlantao: (...args) => mockSubstituirEscalaPlantao(...args),
  publicarEscalaPlantao: (...args) => mockPublicarEscalaPlantao(...args),
}));

describe("Plantoes", () => {
  beforeEach(() => {
    mockListarUsuarios.mockResolvedValue({ data: [
      { id: "user-1", nome: "João", apelido: "Silva", ativo: true, account_status: "active" },
      { id: "user-2", nome: "Ana", apelido: "Costa", ativo: true, account_status: "active" },
    ], error: null });
    mockListarEscalaPlantaoPorPeriodo.mockResolvedValue({ data: null, error: null });
    mockSubstituirEscalaPlantao.mockResolvedValue({ data: "escala-1", error: null });
    mockPublicarEscalaPlantao.mockResolvedValue({ data: "escala-1", error: null });
  });

  it("mantém participação local, gera pelo menos quatro sábados com nomes e publica como read-only", async () => {
    render(<Plantoes />);
    expect(await screen.findByText("João Silva")).toBeTruthy();

    expect(screen.getByText(/4 sábados/)).toBeTruthy();
    const checkbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(mockSubstituirEscalaPlantao).not.toHaveBeenCalled();

    mockListarEscalaPlantaoPorPeriodo.mockResolvedValueOnce({
      data: { escala_id: "escala-1", escala_estado: "rascunho", linhas: [
        { data: "2026-08-01", usuario_id: "user-1" },
        { data: "2026-08-08", usuario_id: "user-2" },
        { data: "2026-08-15", usuario_id: "user-1" },
        { data: "2026-08-22", usuario_id: "user-2" },
      ] }, error: null,
    });
    fireEvent.click(screen.getByRole("button", { name: "Gerar plantão" }));
    await waitFor(() => expect(mockSubstituirEscalaPlantao).toHaveBeenCalledTimes(1));
    const payload = mockSubstituirEscalaPlantao.mock.calls[0][0];
    expect(payload.linhas).toHaveLength(4);
    expect(payload.linhas.every((linha) => new Date(`${linha.data}T00:00:00Z`).getUTCDay() === 6)).toBe(true);

    expect(await screen.findByText("RASCUNHO EDITÁVEL")).toBeTruthy();
    expect(screen.getAllByText(/João Silva|Ana Costa/).length).toBeGreaterThan(0);
  });

  it("publica o rascunho e remove as ações de edição", async () => {
    const linhas = [1, 8, 15, 22].map((dia, index) => ({
      data: `2026-08-${String(dia).padStart(2, "0")}`,
      usuario_id: index % 2 ? "user-2" : "user-1",
    }));
    mockListarEscalaPlantaoPorPeriodo.mockResolvedValue({
      data: { escala_id: "escala-1", escala_estado: "rascunho", periodo_inicio: "2026-08-01", periodo_fim: "2026-08-22", linhas },
      error: null,
    });
    render(<Plantoes />);
    expect(await screen.findByRole("button", { name: "Publicar plantão" })).toBeTruthy();

    mockListarEscalaPlantaoPorPeriodo.mockResolvedValueOnce({
      data: { escala_id: "escala-1", escala_estado: "publicada", periodo_inicio: "2026-08-01", periodo_fim: "2026-08-22", linhas },
      error: null,
    });
    fireEvent.click(screen.getByRole("button", { name: "Publicar plantão" }));

    await waitFor(() => expect(mockPublicarEscalaPlantao).toHaveBeenCalledWith({ user: mockUser, escalaId: "escala-1" }));
    expect(await screen.findByText("PUBLICADO — NÃO EDITÁVEL")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Publicar plantão" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Guardar alterações" })).toBeNull();
  });
});
