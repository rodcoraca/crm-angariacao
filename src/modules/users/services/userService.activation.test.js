import { readFileSync } from "fs";
import { join } from "path";
import { guardarUsuarioComAuditoria, reenviarConviteAtivacaoUtilizador } from "./userService";
import { supabase } from "../../../supabase";
import { applyEmpresaScope } from "../../../utils/empresaScope";
import { markUserAccountActive } from "../../auth/services";

jest.mock("../../../supabase", () => ({
  supabase: {
    functions: {
      invoke: jest.fn()
    }
  }
}));

jest.mock("../../../utils/empresaScope", () => ({
  applyEmpresaScope: jest.fn(),
  buildMissingEmpresaError: jest.fn(),
  hasEmpresaId: (value) => Boolean(value),
  resolveEmpresaIdFromContext: (currentUser) => currentUser?.empresa_id || null,
  warnMissingEmpresaId: jest.fn()
}));

jest.mock("../../../utils/usuarios", () => ({
  normalizarPermissoes: (value) => value
}));

jest.mock("../../audit/services", () => ({
  registrarAcessoNegado: jest.fn(),
  registrarCriacao: jest.fn(),
  registrarEdicao: jest.fn()
}));

jest.mock("../../auth/services", () => ({
  alterarPasswordUtilizador: jest.fn(),
  createAuthUserFromAdminFlow: jest.fn(),
  getAuthUserInviteStatus: jest.fn(),
  repairUserAuthAssociations: jest.fn(),
  requestPasswordReset: jest.fn(),
  sendAccountActivationInvite: jest.fn(),
  updateAuthUserEmail: jest.fn(),
  markUserAccountActive: jest.fn()
}));

jest.mock("../repositories", () => ({
  fetchUserPreferencesByUserId: jest.fn(),
  upsertUserPreferencesByUserId: jest.fn()
}));

describe("user activation service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    applyEmpresaScope.mockImplementation((query) => query);
  });

  test("preserves disabled status during administrative edits", async () => {
    const profileQuery = {
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "profile-a",
          auth_user_id: "auth-a",
          email: "user@example.com",
          account_status: "disabled",
          activation_sent_at: null,
          activated_at: null,
          disabled_at: "2026-09-27T10:00:00.000Z"
        },
        error: null
      })
    };
    const updateQuery = {
      eq: jest.fn().mockReturnValue({ error: null })
    };
    supabase.from = jest.fn((table) => {
      if (table !== "usuarios") throw new Error(`Unexpected table: ${table}`);
      return {
        select: jest.fn(() => profileQuery),
        update: jest.fn((payload) => {
          expect(payload.account_status).toBe("disabled");
          expect(payload.activated_at).toBeNull();
          return updateQuery;
        })
      };
    });

    const result = await guardarUsuarioComAuditoria({
      form: {
        nome: "Utilizador",
        apelido: "Desativado",
        email: "user@example.com",
        telefone: "",
        username: "user",
        account_status: "active",
        ativo: true,
        permissoes: {}
      },
      modoEdicao: true,
      usuarioSelecionadoId: "profile-a",
      currentUser: { id: "operator-a", empresa_id: "company-a" },
      perfilOrganizacional: "Consultor",
      permissoesAtuais: {}
    });

    expect(result.error).toBeNull();
    expect(markUserAccountActive).not.toHaveBeenCalled();
  });

  test("reactivates by profile id and never trusts a client auth user id", async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        success: true,
        data: {
          usuarioId: "profile-a",
          authUserId: "auth-a",
          status: "pending_activation"
        }
      },
      error: null
    });

    const result = await reenviarConviteAtivacaoUtilizador({
      usuarioId: "profile-a",
      targetEmail: "new@example.com",
      redirectTo: "https://app.osflow.pt",
      currentUser: { empresa_id: "company-a" }
    });

    expect(result.error).toBeNull();
    expect(supabase.functions.invoke).toHaveBeenCalledWith("reactivate-user", {
      body: {
        usuarioId: "profile-a",
        targetEmail: "new@example.com",
        redirectTo: "https://app.osflow.pt"
      }
    });
    expect(supabase.functions.invoke.mock.calls[0][1].body.authUserId).toBeUndefined();
    expect(supabase.functions.invoke.mock.calls[0][1].body.empresaId).toBeUndefined();
  });

  test("returns the server rejection without presenting activation as successful", async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        success: false,
        error: "permission_denied",
        message: "Sem permissão users.edit."
      },
      error: null
    });

    const result = await reenviarConviteAtivacaoUtilizador({
      usuarioId: "profile-a",
      currentUser: { empresa_id: "company-a" }
    });

    expect(result.error).toEqual({
      code: "permission_denied",
      message: "Sem permissão users.edit."
    });
  });

  test("keeps server identity and tenant checks for usuarioId invite requests", () => {
    const edgeSource = readFileSync(
      join(process.cwd(), "supabase/functions/send-user-invite/index.ts"),
      "utf8"
    );

    expect(edgeSource).toContain("if (usuarioId)");
    expect(edgeSource).toContain("hasUsersEditPermission");
    expect(edgeSource).toContain("if (!profile.auth_user_id)");
    expect(edgeSource).toContain("const resolvedAuthUserId = usuarioId");
    expect(edgeSource).not.toContain("profile?.auth_user_id || authUserId ||");
  });
});
