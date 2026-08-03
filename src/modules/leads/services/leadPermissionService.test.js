import { canManageLead, canTransferLead } from "./leadPermissionService";
import { normalizePermissions } from "../../auth/services/legacyPermissionCompatibility";

const lead = { agente_id: "agent-1" };

describe("leadPermissionService", () => {
  it.each([
    [{ id: "admin", permissoes: { __perfil: "Administrador" } }],
    [{ id: "director", permissoes: { __perfil: "Diretor Comercial" } }],
    [{ id: "agent-1", permissoes: {} }]
  ])("permite gerir e transferir a lead ao utilizador autorizado", (user) => {
    expect(canManageLead(user, lead)).toBe(true);
    expect(canTransferLead(user, lead)).toBe(true);
  });

  it("mantém a lead em leitura para um utilizador sem privilégio nem propriedade", () => {
    const user = {
      id: "agent-2",
      permissoes: {
        __perfil: "Consultor",
        admin_docs_arquitetura: true
      }
    };

    expect(canManageLead(user, lead)).toBe(false);
    expect(canTransferLead(user, lead)).toBe(false);
  });

  it("não concede gestão de Leads a permissões settings ou de documentação", () => {
    const user = {
      id: "agent-2",
      permissoes: {
        __perfil: "Consultor",
        "settings.manage": true,
        "settings.view": true,
        admin_docs_arquitetura: true
      }
    };

    expect(canManageLead(user, lead)).toBe(false);
    expect(canTransferLead(user, lead)).toBe(false);
  });

  it("reconhece a propriedade pelo usuarios.id mesmo quando o auth_user_id é diferente", () => {
    const user = {
      id: "auth-user-1",
      auth_user_id: "auth-user-1",
      perfil_id: "agent-1",
      permissoes: { __perfil: "Consultor" }
    };

    expect(canManageLead(user, lead)).toBe(true);
    expect(canTransferLead(user, lead)).toBe(true);
  });

  it("reconhece Diretor Comercial após a normalização das permissões da sessão", () => {
    const user = {
      id: "director",
      permissoes: normalizePermissions({ __perfil: "Diretor Comercial" })
    };

    expect(canManageLead(user, lead)).toBe(true);
    expect(canTransferLead(user, lead)).toBe(true);
  });
});
