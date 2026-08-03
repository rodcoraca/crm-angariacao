import { resolverNomeAgente } from "./agentService";

describe("resolverNomeAgente", () => {
  it("apresenta o nome do agente resolvido", () => {
    expect(resolverNomeAgente([{ id: "agent-1", nome: "Maria da Silva" }], "agent-1")).toBe("Maria Silva");
  });

  it("resolve pelo usuarios.id quando auth_user_id é diferente", () => {
    expect(resolverNomeAgente([{
      id: "53b7bbce-1111-4111-8111-111111111111",
      auth_user_id: "auth-user-heitor",
      nome: "Heitor"
    }], "53b7bbce-1111-4111-8111-111111111111")).toBe("Heitor");
  });

  it("não apresenta o UUID quando o utilizador associado não existe", () => {
    expect(resolverNomeAgente([], "4d5b1f3c-0000-0000-0000-000000000000")).toBe("Utilizador não encontrado");
  });

  it("não apresenta um UUID usado indevidamente como nome", () => {
    expect(resolverNomeAgente([
      { id: "agent-1", nome: "4d5b1f3c-0000-4000-8000-000000000000" }
    ], "agent-1")).toBe("Utilizador não encontrado");
  });

  it("apresenta o estado sem responsável quando agente_id está vazio", () => {
    expect(resolverNomeAgente([], null)).toBe("Sem agente atribuído");
  });
});
