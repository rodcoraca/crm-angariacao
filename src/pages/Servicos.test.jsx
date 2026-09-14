import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Servicos from "./Servicos";

const mockListarUsuarios = jest.fn();
const mockListarEscalaServicoPorSemana = jest.fn();
const mockSubstituirEscalaServico = jest.fn();
const mockPublicarEscalaServico = jest.fn();
const mockCriarCompromisso = jest.fn();
const mockUser = { id: "auth-1", empresa_id: "empresa-1" };

jest.mock("../theme/ThemeContext", () => ({
  useTheme: () => ({
    spacing: { xs: 4, sm: 8, md: 12 },
    colors: {
      border: "#d1d5db",
      text: "#111827",
      textLight: "#6b7280",
      surface: "#ffffff",
      surfaceSoft: "#f3f4f6",
      success: "#16a34a",
      warning: "#f59e0b",
      primary: "#0f172a",
      danger: "#dc2626",
      muted: "#6b7280",
      focus: "#3b82f6",
      inputBackground: "#ffffff",
    },
    elevation: ["none", "0 1px 2px rgba(15, 23, 42, 0.08)", "0 4px 10px rgba(15, 23, 42, 0.12)"],
    borderRadius: { md: 8 },
    typography: { fontFamily: "sans-serif", caption: { fontSize: 12, fontWeight: 500 }, body: { fontSize: 14, fontWeight: 400 }, cardTitle: { fontSize: 16, fontWeight: 600 } },
    layout: { padding: 16 },
  }),
}));

jest.mock("../modules/auth/context", () => ({
  useAuthContext: () => ({ user: mockUser }),
}));

jest.mock("../components/ui/feedbackBus", () => ({
  notifyError: jest.fn(),
  notifySuccess: jest.fn(),
}));

jest.mock("../modules/users/services", () => ({
  listarUsuarios: (...args) => mockListarUsuarios(...args),
}));

jest.mock("../modules/servicos/services", () => ({
  listarEscalaServicoPorSemana: (...args) => mockListarEscalaServicoPorSemana(...args),
  substituirEscalaServico: (...args) => mockSubstituirEscalaServico(...args),
  publicarEscalaServico: (...args) => mockPublicarEscalaServico(...args),
  criarCompromisso: (...args) => mockCriarCompromisso(...args),
}));

describe("Servicos", () => {
  beforeEach(() => {
    mockListarUsuarios.mockResolvedValue({
      data: [
        { id: "user-1", nome: "João", apelido: "Silva", ativo: true, account_status: "active" },
        { id: "user-2", nome: "Ana", apelido: "Costa", ativo: true, account_status: "active" },
        { id: "user-3", nome: "Rui", apelido: "Lopes", ativo: true, account_status: "active" },
        { id: "user-4", nome: "Marta", apelido: "Pires", ativo: true, account_status: "active" },
        { id: "user-5", nome: "Paulo", apelido: "Nunes", ativo: true, account_status: "active" },
        { id: "user-6", nome: "Inês", apelido: "Ramos", ativo: true, account_status: "active" },
      ],
      error: null,
    });
    mockListarEscalaServicoPorSemana.mockResolvedValue({
      data: null,
      error: null,
    });
    mockCriarCompromisso.mockResolvedValue({ error: null, data: null });
    mockSubstituirEscalaServico.mockResolvedValue({ error: null, data: null });
    mockPublicarEscalaServico.mockResolvedValue({ error: null, data: "escala-1" });
    mockListarEscalaServicoPorSemana.mockClear();
    mockSubstituirEscalaServico.mockClear();
    mockPublicarEscalaServico.mockClear();
  });

  it("exibe semana legível e permite alternar a participação sem texto funcional em branco", async () => {
    const { container } = render(<Servicos />);

    await waitFor(() => expect(screen.getAllByText("João Silva").length).toBeGreaterThan(0));

    expect(screen.getByText(/\d{2}\/\d{2}\/\d{4}\s+—\s+\d{2}\/\d{2}\/\d{4}/)).toBeTruthy();
    expect(screen.getByText("Segunda-feira → Sexta-feira")).toBeTruthy();
    expect(screen.queryByText("Serviços existentes")).toBeNull();

    expect(screen.getAllByText("Selecionar dias").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Adicionar" }).length).toBeGreaterThan(0);

    const checkbox = screen.getAllByRole("checkbox")[0];
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it("permite várias indisponibilidades no mesmo período e gera escala respeitando as combinações em memória", async () => {
    const { container } = render(<Servicos />);

    await waitFor(() => expect(screen.getAllByText("João Silva").length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByText("Selecionar dias")[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Quarta-feira" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Sexta-feira" })[0]);

    const periodoSelect = screen.getAllByRole("combobox").find((element) => element.value === "" && Array.from(element.options).some((option) => option.value === "tarde"));

    fireEvent.change(periodoSelect, { target: { value: "tarde" } });

    screen.getAllByRole("checkbox").forEach((checkbox) => fireEvent.click(checkbox));

    fireEvent.click(screen.getAllByRole("button", { name: "Adicionar" })[0]);

    expect(screen.getByText("Quarta-feira, Sexta-feira")).toBeTruthy();
    expect(mockListarEscalaServicoPorSemana).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Gerar escala" }));

    await waitFor(() => expect(mockSubstituirEscalaServico).toHaveBeenCalledTimes(1));

    const payload = mockSubstituirEscalaServico.mock.calls[0][0];
    const diasComIndisponibilidade = payload.linhas.map((item) => item.data);
    expect(diasComIndisponibilidade).toHaveLength(10);
    expect(new Set(payload.linhas.map((item) => item.usuario_id))).toEqual(new Set(["user-1", "user-2", "user-3", "user-4", "user-5", "user-6"]));
    expect(payload.linhas.some((item) => item.hora_inicio === "14:00" && item.hora_fim === "18:00")).toBe(true);
    expect(payload.semanaInicio).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Gerar escala" }));
    await waitFor(() => expect(mockSubstituirEscalaServico).toHaveBeenCalledTimes(2));
    expect(mockSubstituirEscalaServico.mock.calls[1][0].semanaInicio).toBe(payload.semanaInicio);
    expect(mockSubstituirEscalaServico.mock.calls[1][0].linhas).toHaveLength(10);
  });

  it("carrega a escala persistida completa sem depender de serviços", async () => {
    mockListarEscalaServicoPorSemana.mockResolvedValueOnce({
      data: {
        id: "escala-1",
        semana_inicio: "2026-09-07",
        semana_fim: "2026-09-11",
        escalas_servico_linhas: [
          { data: "2026-09-07", hora_inicio: "09:00", usuario_id: "user-1", titulo: "João Silva" },
          { data: "2026-09-07", hora_inicio: "14:00", usuario_id: "user-2", titulo: "Ana Costa" },
          { data: "2026-09-08", hora_inicio: "09:00", usuario_id: "user-3", titulo: "Rui Lopes" },
          { data: "2026-09-08", hora_inicio: "14:00", usuario_id: "user-4", titulo: "Marta Pires" },
          { data: "2026-09-09", hora_inicio: "09:00", usuario_id: "user-5", titulo: "Paulo Nunes" },
          { data: "2026-09-09", hora_inicio: "14:00", usuario_id: "user-6", titulo: "Inês Ramos" },
          { data: "2026-09-10", hora_inicio: "09:00", usuario_id: "user-1", titulo: "João Silva" },
          { data: "2026-09-10", hora_inicio: "14:00", usuario_id: "user-2", titulo: "Ana Costa" },
          { data: "2026-09-11", hora_inicio: "09:00", usuario_id: "user-3", titulo: "Rui Lopes" },
          { data: "2026-09-11", hora_inicio: "14:00", usuario_id: "user-4", titulo: "Marta Pires" },
        ],
      },
      error: null,
    });

    const { container } = render(<Servicos />);

    await waitFor(() => expect(screen.getAllByText("João Silva").length).toBeGreaterThan(0));
    expect(screen.getByText("Segunda")).toBeTruthy();
    expect(screen.getByText("Sexta")).toBeTruthy();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(11);
    expect(screen.queryByText("Serviços existentes")).toBeNull();
  });

  it("publica um rascunho e torna a escala não editável", async () => {
    const linhas = Array.from({ length: 10 }, (_, index) => ({
      data: `2026-09-${String(7 + Math.floor(index / 2)).padStart(2, "0")}`,
      hora_inicio: index % 2 === 0 ? "09:00" : "14:00",
      usuario_id: `user-${(index % 6) + 1}`,
      titulo: ["João Silva", "Ana Costa", "Rui Lopes", "Marta Pires", "Paulo Nunes", "Inês Ramos"][index % 6],
    }));
    mockListarEscalaServicoPorSemana
      .mockResolvedValueOnce({ data: { id: "escala-1", estado: "rascunho", escalas_servico_linhas: linhas }, error: null })
      .mockResolvedValueOnce({ data: { id: "escala-1", estado: "publicada", published_at: "2026-09-10T10:00:00Z", published_by: "user-1", escalas_servico_linhas: linhas }, error: null });

    render(<Servicos />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Publicar escala" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Publicar escala" }));

    await waitFor(() => expect(mockPublicarEscalaServico).toHaveBeenCalledWith({ user: mockUser, escalaId: "escala-1" }));
    await waitFor(() => expect(screen.getByText("PUBLICADA — não editável")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Guardar alterações" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Publicar escala" })).toBeNull();
  });
});
