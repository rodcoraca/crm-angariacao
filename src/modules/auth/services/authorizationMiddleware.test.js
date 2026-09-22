import {
  authorizeProtectedView,
  getRequiredPermission
} from "./authorizationMiddleware";
import { getAllPermissionDefinitions } from "./permissionCatalog";

describe("autorizacao de Leads Acompanhamento", () => {
  it("regista a permissao propria no catalogo", () => {
    expect(getAllPermissionDefinitions()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "leads.acompanhamento.view",
          module: "crm",
          group: "leads_acompanhamento"
        })
      ])
    );
  });

  it("protege a view com a permissao de Leads", () => {
    expect(getRequiredPermission("leads_acompanhamento")).toBe("leads.acompanhamento.view");
    expect(authorizeProtectedView("leads_acompanhamento", {
      user: { id: "auth-user" },
      activeCompanyId: "empresa-1",
      perfil: { permissoes: { "logs.view": true } }
    }).allowed).toBe(false);
    expect(authorizeProtectedView("leads_acompanhamento", {
      user: { id: "auth-user" },
      activeCompanyId: "empresa-1",
      perfil: { permissoes: { "leads.acompanhamento.view": true } }
    }).allowed).toBe(true);
  });
});
