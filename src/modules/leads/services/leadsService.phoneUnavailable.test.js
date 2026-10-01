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

jest.mock("./agentService", () => ({
  carregarAgentesParaFicha: jest.fn(async () => []),
  resolverNomeAgente: jest.fn(() => "Agente")
}));

jest.mock("../../../components/ui/feedbackBus", () => ({
  notifyError: jest.fn(),
  notifySuccess: jest.fn()
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
  fetchLeadByTelefone,
  fetchLeadByTelefoneExcludingId,
  fetchProviderLeadByCrmLeadId,
  insertLead,
  updateLeadById
} = require("../repositories/leadsRepository");
const { fetchLeadLembreteAtivo } = require("../repositories/leadLembretesRepository");
const { carregarHistoricoLeadLembretes } = require("./leadLembretesService");
const { carregarAgentesParaFicha } = require("./agentService");
const { auditMutation } = require("../../audit/services");
const { canManageLead } = require("./leadPermissionService");
const { carregarFichaLead, salvarFichaLead, salvarLeadFluxo } = require("./leadsService");
const FichaLead = require("../../../FichaLead").default;
const React = require("react");
const { render, screen, fireEvent, waitFor } = require("@testing-library/react");
const { ThemeProvider } = require("../../../theme/ThemeContext");
const { NavigationGuard } = require("../../../shared/navigation");

const user = {
  id: "auth-user-1",
  perfil_id: "user-1",
  empresa_id: "empresa-1",
  permissoes: { __perfil: "administrador" }
};

const baseForm = {
  nome: "Maria",
  telefone: "",
  telefone_nao_disponivel: false,
  tipo: "morno",
  origem: "site",
  observacoes: "",
  status: "novo",
  agente_id: "",
  data_visita: "",
  hora_visita: "",
  local_visita: "",
  status_visita: "",
  lembrete_ativo: false,
  data_lembrete: "",
  hora_lembrete: "",
  lembrete_opcao: "0"
};

const leadAtual = {
  id: "lead-1",
  nome: "Maria",
  telefone: null,
  telefone_nao_disponivel: false,
  tipo: "morno",
  origem: "site",
  observacoes: "",
  status: "novo",
  agente_id: "user-1",
  data_visita: null,
  hora_visita: null,
  local_visita: null,
  status_visita: null
};

describe("leadsService phone-unavailable save flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auditMutation.mockImplementation((eventType, execute) => execute());
    canManageLead.mockReturnValue(true);
    carregarHistoricoLeadLembretes.mockResolvedValue({ data: [], error: null });
    carregarAgentesParaFicha.mockResolvedValue([]);
    fetchLeadById.mockResolvedValue({ data: { ...leadAtual }, error: null });
    fetchLeadByTelefone.mockResolvedValue({ data: null, error: null });
    fetchLeadByTelefoneExcludingId.mockResolvedValue({ data: null, error: null });
    fetchLeadLembreteAtivo.mockResolvedValue({ data: null, error: null });
    fetchProviderLeadByCrmLeadId.mockResolvedValue({ data: null, error: null });
    insertLead.mockResolvedValue({ data: { id: "lead-created" }, error: null });
    updateLeadById.mockResolvedValue({ data: { id: "lead-1" }, error: null });
  });

  test("saves a valid normalized phone with the unavailable flag false", async () => {
    const result = await salvarFichaLead({
      leadId: "lead-1",
      form: { ...baseForm, telefone: "+351 912 345 678" },
      user
    });

    expect(result).toEqual({ error: null });
    expect(fetchLeadByTelefoneExcludingId).toHaveBeenCalledWith("lead-1", "351912345678", "empresa-1");
    expect(updateLeadById).toHaveBeenCalledWith(
      "lead-1",
      expect.objectContaining({ telefone: "351912345678", telefone_nao_disponivel: false }),
      "empresa-1"
    );
  });

  test("rejects an invalid phone and preserves the existing error", async () => {
    const result = await salvarFichaLead({
      leadId: "lead-1",
      form: { ...baseForm, telefone: "123" },
      user
    });

    expect(result.error).toMatchObject({
      message: "Informe o telefone com 12 dígitos (indicativo + 9 dígitos).",
      invalidPhone: true
    });
    expect(fetchLeadByTelefoneExcludingId).not.toHaveBeenCalled();
    expect(updateLeadById).not.toHaveBeenCalled();
  });

  test.each([false, "true", 1])("does not allow an empty phone unless the flag is boolean true (%p)", async (flag) => {
    const result = await salvarFichaLead({
      leadId: "lead-1",
      form: { ...baseForm, telefone: null, telefone_nao_disponivel: flag },
      user
    });

    expect(result.error).toMatchObject({ invalidPhone: true });
    expect(updateLeadById).not.toHaveBeenCalled();
  });

  test.each(["", null])("saves an empty phone as unavailable (%s)", async (telefone) => {
    const result = await salvarFichaLead({
      leadId: "lead-1",
      form: { ...baseForm, telefone, telefone_nao_disponivel: true },
      user
    });

    expect(result).toEqual({ error: null });
    expect(fetchLeadByTelefoneExcludingId).not.toHaveBeenCalled();
    expect(updateLeadById).toHaveBeenCalledWith(
      "lead-1",
      expect.objectContaining({ telefone: null, telefone_nao_disponivel: true }),
      "empresa-1"
    );
  });

  test("converts an existing phone to unavailable when explicitly checked", async () => {
    fetchLeadById.mockResolvedValue({
      data: { ...leadAtual, telefone: "351912345678", telefone_nao_disponivel: false },
      error: null
    });

    const result = await salvarFichaLead({
      leadId: "lead-1",
      form: { ...baseForm, telefone: "", telefone_nao_disponivel: true },
      user
    });

    expect(result.error).toBeNull();
    expect(updateLeadById).toHaveBeenCalledWith(
      "lead-1",
      expect.objectContaining({ telefone: null, telefone_nao_disponivel: true }),
      "empresa-1"
    );
  });

  test("saves a newly entered phone when changing from unavailable to available", async () => {
    fetchLeadById.mockResolvedValue({
      data: { ...leadAtual, telefone: null, telefone_nao_disponivel: true },
      error: null
    });

    const result = await salvarFichaLead({
      leadId: "lead-1",
      form: { ...baseForm, telefone: "+351 912 345 678", telefone_nao_disponivel: false },
      user
    });

    expect(result.error).toBeNull();
    expect(updateLeadById).toHaveBeenCalledWith(
      "lead-1",
      expect.objectContaining({ telefone: "351912345678", telefone_nao_disponivel: false }),
      "empresa-1"
    );
  });

  test("normalizes a conflicting checked flag and phone to the consistent unavailable state", async () => {
    const result = await salvarFichaLead({
      leadId: "lead-1",
      form: { ...baseForm, telefone: "+351 912 345 678", telefone_nao_disponivel: true },
      user
    });

    expect(result.error).toBeNull();
    expect(updateLeadById).toHaveBeenCalledWith(
      "lead-1",
      expect.objectContaining({ telefone: null, telefone_nao_disponivel: true }),
      "empresa-1"
    );
    expect(fetchLeadByTelefoneExcludingId).not.toHaveBeenCalled();
  });

  test("loads a legacy null phone unchecked, then saves the explicit unavailable decision", async () => {
    const loaded = await carregarFichaLead("lead-1", user);

    expect(loaded.error).toBeNull();
    expect(loaded.form).toEqual(expect.objectContaining({ telefone: "", telefone_nao_disponivel: false }));

    const result = await salvarFichaLead({
      leadId: "lead-1",
      form: { ...loaded.form, telefone_nao_disponivel: true },
      user
    });

    expect(result.error).toBeNull();
    expect(updateLeadById).toHaveBeenCalledWith(
      "lead-1",
      expect.objectContaining({ telefone: null, telefone_nao_disponivel: true }),
      "empresa-1"
    );
  });

  test("keeps duplicate-phone validation for available phones and skips it when unavailable", async () => {
    fetchLeadByTelefoneExcludingId.mockResolvedValue({ data: { id: "lead-duplicate" }, error: null });

    const duplicateResult = await salvarFichaLead({
      leadId: "lead-1",
      form: { ...baseForm, telefone: "+351 912 345 678" },
      user
    });

    expect(duplicateResult.error).toMatchObject({ duplicatePhone: true });
    expect(updateLeadById).not.toHaveBeenCalled();

    fetchLeadByTelefoneExcludingId.mockClear();
    fetchLeadById.mockResolvedValue({
      data: { ...leadAtual, telefone: "351912345678", telefone_nao_disponivel: false },
      error: null
    });

    const unavailableResult = await salvarFichaLead({
      leadId: "lead-1",
      form: { ...baseForm, telefone: "", telefone_nao_disponivel: true },
      user
    });

    expect(unavailableResult.error).toBeNull();
    expect(fetchLeadByTelefoneExcludingId).not.toHaveBeenCalled();
    expect(updateLeadById).toHaveBeenCalledWith(
      "lead-1",
      expect.objectContaining({ telefone: null, telefone_nao_disponivel: true }),
      "empresa-1"
    );
  });

  test("creates leads without a phone with the explicit flag false", async () => {
    const result = await salvarLeadFluxo({
      nome: "Maria",
      telefone: null,
      tipo: "morno",
      origem: "Radar",
      observacao: "",
      user
    });

    expect(result.error).toBeNull();
    expect(insertLead).toHaveBeenCalledWith(expect.objectContaining({
      telefone: null,
      telefone_nao_disponivel: false
    }));
  });

  describe("FichaLead phone checkbox", () => {
    function renderFicha(lead = leadAtual) {
      fetchLeadById.mockResolvedValue({ data: { ...lead }, error: null });

      return render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(
            NavigationGuard,
            null,
            React.createElement(FichaLead, { leadId: "lead-1", user })
          )
        )
      );
    }

    test("shows an available phone with the checkbox unchecked", async () => {
      renderFicha({ ...leadAtual, telefone: "351912345678", telefone_nao_disponivel: false });

      await waitFor(() => expect(screen.getAllByRole("textbox")[0].value).toBe("351912345678"));
      expect(screen.getByRole("checkbox").checked).toBe(false);
      expect(screen.getAllByRole("textbox")[0].disabled).toBe(false);
    });

    test("clears and disables the phone when checked, then re-enables it when unchecked", async () => {
      renderFicha({ ...leadAtual, telefone: "351912345678", telefone_nao_disponivel: false });

      const phoneInput = await screen.findByDisplayValue("351912345678");
      const checkbox = screen.getByRole("checkbox");

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
      expect(phoneInput.value).toBe("");
      expect(phoneInput.disabled).toBe(true);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
      expect(phoneInput.disabled).toBe(false);
      expect(phoneInput.value).toBe("");
    });

    test("allows saving without a phone when the checkbox is checked", async () => {
      renderFicha({ ...leadAtual, telefone: null, telefone_nao_disponivel: false });

      const checkbox = await screen.findByRole("checkbox");
      fireEvent.click(checkbox);
      fireEvent.click(screen.getByRole("button", { name: "Guardar alterações" }));

      await waitFor(() => expect(updateLeadById).toHaveBeenCalledWith(
        "lead-1",
        expect.objectContaining({ telefone: null, telefone_nao_disponivel: true }),
        "empresa-1"
      ));
    });
  });
});
