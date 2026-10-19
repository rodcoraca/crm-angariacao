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

describe("autorizacao de Empreendimentos", () => {
  it("protege a vista com empreendimentos.view e não com inventory.view", () => {
    expect(getRequiredPermission("estoque_np_empreendimentos")).toBe("empreendimentos.view");
    expect(authorizeProtectedView("estoque_np_empreendimentos", {
      user: { id: "auth-user" },
      activeCompanyId: "empresa-1",
      perfil: { permissoes: { "inventory.view": true } }
    }).allowed).toBe(false);
    expect(authorizeProtectedView("estoque_np_empreendimentos", {
      user: { id: "auth-user" },
      activeCompanyId: "empresa-1",
      perfil: { permissoes: { "empreendimentos.view": true } }
    }).allowed).toBe(true);
  });

  it("mantém Não Publicitados protegido por inventory.view", () => {
    expect(getRequiredPermission("estoque_np")).toBe("inventory.view");
    expect(authorizeProtectedView("estoque_np", {
      user: { id: "auth-user" },
      activeCompanyId: "empresa-1",
      perfil: { permissoes: { "empreendimentos.view": true } }
    }).allowed).toBe(false);
    expect(authorizeProtectedView("estoque_np", {
      user: { id: "auth-user" },
      activeCompanyId: "empresa-1",
      perfil: { permissoes: { "inventory.view": true } }
    }).allowed).toBe(true);
  });
});
