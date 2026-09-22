import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "../theme/ThemeContext";
import LeadsAcompanhamento from "./LeadsAcompanhamento";
import { carregarAcompanhamentoLeads } from "../modules/leads/services";

jest.mock("../modules/leads/services", () => ({
  carregarAcompanhamentoLeads: jest.fn()
}));

const report = {
  kpis: {
    imported: 1,
    accompanied: null,
    status_changed: 2,
    operated: 3,
    reminders_created: 1,
    reminders_completed: 1,
    total: 1
  },
  global_kpis: {
    total: 2,
    new: 1,
    accompanied: 1,
    imported: 1,
    imported_unlinked: 16,
    status_counts: { novo: 1, em_contacto: 1 }
  },
  global_agents: [{ user_id: "user-1", user_name: "Utilizador", portfolio_total: 2, portfolio_new: 1, portfolio_accompanied: 1 }],
  reminder_state: { pending: 1, overdue: 0 },
  users: [{ user_id: "user-1", user_name: "Utilizador", imported: 1, accompanied: null, status_changed: 2, operated: 3, reminders_created: 1, reminders_completed: 1 }],
  activities: [{
    id: "activity-1",
    created_at: "2026-09-22T10:00:00.000Z",
    lead_id: "lead-1",
    lead_name: "Lead teste",
    current_status: "em_contacto",
    activity_type: "Criação",
    action: "criar_lead",
    actor_name: "Utilizador",
    details: {}
  }]
};

describe("LeadsAcompanhamento", () => {
  it("monta com o tema real e renderiza os elementos principais", async () => {
    carregarAcompanhamentoLeads.mockResolvedValue({ data: report, error: null });

    render(
      <ThemeProvider>
        <LeadsAcompanhamento user={{ id: "auth-user", perfil_id: "user-1" }} />
      </ThemeProvider>
    );

    expect(await screen.findByRole("heading", { name: "Acompanhamento" })).toBeTruthy();
    expect((await screen.findAllByText("Leads importadas")).length).toBeGreaterThan(0);
    expect(screen.getByText("Período inicial")).toBeTruthy();
    expect(screen.getAllByText("O que aconteceu").length).toBe(2);
    expect(screen.getByText("O que aconteceu", { selector: "th" })).toBeTruthy();
    expect(screen.queryByText("Tipo de atividade")).toBeNull();
    expect(screen.getByText("Atividade por utilizador")).toBeTruthy();
    expect(screen.getByText("Detalhe das atividades")).toBeTruthy();
    expect(screen.getByText("Total")).toBeTruthy();
    expect(screen.getAllByText("Novas").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Em acompanhamento").length).toBeGreaterThan(1);
    expect(screen.getByText("Importações sem Lead CRM")).toBeTruthy();
    expect(screen.getAllByText("Lead teste").length).toBeGreaterThan(0);
  });
});
