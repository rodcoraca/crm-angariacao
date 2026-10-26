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

  async function saveWithStatuses(persisted, requested) {
    const profileQuery = {
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "profile-a",
          auth_user_id: "auth-a",
          email: "user@example.com",
          account_status: persisted,
          activation_sent_at: null,
          activated_at: persisted === "active" ? "2026-09-01T10:00:00.000Z" : null,
          disabled_at: persisted === "disabled" ? "2026-09-27T10:00:00.000Z" : null
        },
        error: null
      })
    };
    let savedPayload = null;
    supabase.from = jest.fn((table) => {
      if (table !== "usuarios") throw new Error(`Unexpected table: ${table}`);
      return {
        select: jest.fn(() => profileQuery),
        update: jest.fn((payload) => {
          savedPayload = payload;
          return { eq: jest.fn().mockReturnValue({ error: null }) };
        })
      };
    });

    const result = await guardarUsuarioComAuditoria({
      form: {
        nome: "Utilizador",
        apelido: "Teste",
        email: "user@example.com",
        telefone: "",
        username: "user",
        account_status: requested,
        ativo: requested !== "disabled",
        permissoes: {}
      },
      modoEdicao: true,
      usuarioSelecionadoId: "profile-a",
      currentUser: { id: "operator-a", empresa_id: "company-a" },
      perfilOrganizacional: "Consultor",
      permissoesAtuais: {}
    });

    expect(result.error).toBeNull();
    return savedPayload;
  }

  test("persists active -> disabled from the edit form", async () => {
    const payload = await saveWithStatuses("active", "disabled");
    expect(payload.account_status).toBe("disabled");
    expect(payload.ativo).toBe(false);
    expect(payload.activated_at).toBeNull();
    expect(payload.disabled_at).toEqual(expect.any(String));
  });

  test("persists disabled -> active from the edit form", async () => {
    const payload = await saveWithStatuses("disabled", "active");
    expect(payload.account_status).toBe("active");
    expect(payload.ativo).toBe(true);
    expect(payload.disabled_at).toBeNull();
    expect(payload.activated_at).toEqual(expect.any(String));
    expect(markUserAccountActive).not.toHaveBeenCalled();
  });

  test("keeps pending_activation until the activation flow completes", async () => {
    const payload = await saveWithStatuses("pending_activation", "active");
    expect(payload.account_status).toBe("pending_activation");
    expect(payload.activated_at).toBeNull();
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

  test("keeps activation redirect validation in both edge functions", () => {
    const sendInviteSource = readFileSync(
      join(process.cwd(), "supabase/functions/send-user-invite/index.ts"),
      "utf8"
    );
    const reactivateSource = readFileSync(
      join(process.cwd(), "supabase/functions/reactivate-user/index.ts"),
      "utf8"
    );

    for (const edgeSource of [sendInviteSource, reactivateSource]) {
      expect(edgeSource).toContain('url.searchParams.set("activation", "1")');
      expect(edgeSource).toContain('protocol === "https:"');
      expect(edgeSource).toContain("url.username || url.password");
      expect(edgeSource).toContain('["", "3000", "3001"]');
    }

    expect(sendInviteSource).toContain('const DEFAULT_ACTIVATION_REDIRECT = "https://app.osflow.pt/"');
    expect(reactivateSource).toContain('const DEFAULT_ACTIVATION_REDIRECT = "https://app.osflow.pt/?activation=1"');
  });

  test("preserves active status and activated_at when resending activation", () => {
    const source = readFileSync(
      join(process.cwd(), "supabase/functions/reactivate-user/index.ts"),
      "utf8"
    );

    expect(source).toContain('previousStatus === "active"');
    expect(source).toContain("profile.activated_at || null");
    expect(source).toContain("activated_at: nextActivatedAt");
  });

  test("keeps pending_activation without activated_at when resending activation", () => {
    const source = readFileSync(
      join(process.cwd(), "supabase/functions/reactivate-user/index.ts"),
      "utf8"
    );

    expect(source).toContain('"pending_activation"');
    expect(source).toContain("const nextActivatedAt = previousStatus === \"active\"");
    expect(source).toContain("  : null;");
  });

  test("does not automatically reactivate disabled accounts", () => {
    const source = readFileSync(
      join(process.cwd(), "supabase/functions/reactivate-user/index.ts"),
      "utf8"
    );

    expect(source).toContain('previousStatus === "disabled"');
    expect(source).toContain('? "disabled"');
    expect(source).toContain("disabled_at: nextDisabledAt");
    expect(source).toContain('ativo: nextStatus !== "disabled"');
  });

  test("preserves the existing profile update error response", () => {
    const source = readFileSync(
      join(process.cwd(), "supabase/functions/reactivate-user/index.ts"),
      "utf8"
    );

    expect(source).toContain('return jsonResponse(500, { success: false, error: "profile_update_failed" });');
  });
});
