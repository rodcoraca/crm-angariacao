import { applyReminderOwnerScope } from "./leadLembretesRepository";

describe("scope pessoal de lead_lembretes", () => {
  it("aplica criado_por ao utilizador A", () => {
    const query = { eq: jest.fn().mockReturnThis() };

    const scopedQuery = applyReminderOwnerScope(query, "usuario-a");

    expect(scopedQuery).toBe(query);
    expect(query.eq).toHaveBeenCalledWith("criado_por", "usuario-a");
  });

  it("aplica criado_por ao utilizador B sem reutilizar o scope de A", () => {
    const queryA = { eq: jest.fn().mockReturnThis() };
    const queryB = { eq: jest.fn().mockReturnThis() };

    applyReminderOwnerScope(queryA, "usuario-a");
    applyReminderOwnerScope(queryB, "usuario-b");

    expect(queryA.eq).toHaveBeenCalledWith("criado_por", "usuario-a");
    expect(queryA.eq).not.toHaveBeenCalledWith("criado_por", "usuario-b");
    expect(queryB.eq).toHaveBeenCalledWith("criado_por", "usuario-b");
  });
});
