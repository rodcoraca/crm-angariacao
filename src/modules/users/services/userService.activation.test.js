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

let sendUserInviteModule;

beforeAll(() => {
  globalThis.Deno = {
    env: {
      get: jest.fn(() => undefined)
    },
    serve: jest.fn()
  };

  sendUserInviteModule = require(join(process.cwd(), "supabase/functions/send-user-invite/index.ts"));
});

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
    expect(edgeSource).toContain('"users.create"');
    expect(edgeSource).toContain('"users.edit"');
    expect(edgeSource).toContain('const targetEmpresaId = String(profile?.empresa_id || empresaId || "").trim()');
    expect(edgeSource).toContain('const authClient =');
    expect(edgeSource).toContain('await authClient.auth.getUser(');
    expect(edgeSource).toContain('SUPABASE_ANON_KEY');
    expect(edgeSource).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(edgeSource).toContain('"missing_authorization"');
    expect(edgeSource).toContain('"invalid_token"');
    expect(edgeSource).toContain('"tenant_access_denied"');
    expect(edgeSource).toContain('"permission_denied"');
    expect(edgeSource).toContain('requiredPermission: permissionCode');
    expect(edgeSource).toContain('operatorId: authUser.user.id');
    expect(edgeSource).toContain('inviteUserByEmail(');
    expect(edgeSource).toContain("if (usuarioId && (!profile || !profile.auth_user_id))");
    expect(edgeSource).toContain("const resolvedAuthUserId = usuarioId");
    expect(edgeSource).not.toContain("profile?.auth_user_id || authUserId ||");
  });

  test("allows the global ADMIN role to operate on a valid different company", async () => {
    const { hasUsersPermission } = sendUserInviteModule;
    const adminClient = {
      from: jest.fn((table) => {
        if (table === "empresas") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: jest.fn(async () => ({ data: { id: "empresa-b" }, error: null }))
              }))
            }))
          };
        }

        if (table === "user_roles") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  or: jest.fn(async () => ({
                    data: [{
                      role_id: "role-admin",
                      empresa_id: null,
                      is_primary: true,
                      roles: { code: "ADMIN", is_active: true }
                    }],
                    error: null
                  }))
                }))
              }))
            }))
          };
        }

        if (table === "role_permissions") {
          return {
            select: jest.fn(() => ({
              in: jest.fn(async () => ({
                data: [{ permissions: { code: "users.edit", is_active: true } }],
                error: null
              }))
            }))
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      })
    };

    await expect(hasUsersPermission(adminClient, "auth-user-1", "empresa-b", "users.edit")).resolves.toBe(true);
  });

  test("blocks a non-ADMIN global role from cross-company access", async () => {
    const { hasUsersPermission } = sendUserInviteModule;
    const adminClient = {
      from: jest.fn((table) => {
        if (table === "empresas") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: jest.fn(async () => ({ data: { id: "empresa-b" }, error: null }))
              }))
            }))
          };
        }

        if (table === "user_roles") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  or: jest.fn(async () => ({
                    data: [{
                      role_id: "role-consultor",
                      empresa_id: null,
                      is_primary: true,
                      roles: { code: "CONSULTOR", is_active: true }
                    }],
                    error: null
                  }))
                }))
              }))
            }))
          };
        }

        if (table === "role_permissions") {
          return {
            select: jest.fn(() => ({
              in: jest.fn(async () => ({
                data: [],
                error: null
              }))
            }))
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      })
    };

    await expect(hasUsersPermission(adminClient, "auth-user-2", "empresa-b", "users.edit")).resolves.toBe(false);
  });

  test("finalizeAuditRecord rejects when the audit row is not actually updated", async () => {
    const { finalizeAuditRecord } = sendUserInviteModule;
    const adminClient = {
      from: jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              maybeSingle: jest.fn(async () => ({ data: null, error: null }))
            }))
          }))
        }))
      }))
    };

    await expect(finalizeAuditRecord(adminClient, {
      auditId: "audit-123",
      action: "invite",
      status: "success",
      error: null
    })).rejects.toThrow("audit_update_failed");
  });

  test("finalizeAuditRecord succeeds when the target audit row exists and is updated", async () => {
    const { finalizeAuditRecord } = sendUserInviteModule;
    const adminClient = {
      from: jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              maybeSingle: jest.fn(async () => ({ data: { id: "audit-123" }, error: null }))
            }))
          }))
        }))
      }))
    };

    await expect(finalizeAuditRecord(adminClient, {
      auditId: "audit-123",
      action: "invite",
      status: "success",
      error: null
    })).resolves.toBeUndefined();
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

  test("audits failed writes without exposing sensitive details and keeps the operation action in metadata", () => {
    const edgeSource = readFileSync(
      join(process.cwd(), "supabase/functions/send-user-invite/index.ts"),
      "utf8"
    );

    expect(edgeSource).toContain('throw new Error("audit_write_failed")');
    expect(edgeSource).toContain('console.error("[send-user-invite] audit_write_failed"');
    expect(edgeSource).toContain('const normalizedAction = String(action || "").trim().toLowerCase();');
    expect(edgeSource).toContain('case "invite":');
    expect(edgeSource).toContain('case "resend_invite":');
    expect(edgeSource).toContain('metadata: {');
    expect(edgeSource).toContain('action,');
    expect(edgeSource).toContain('result: status,');
  });

  test("treats missing usuarioId profiles as explicit profile_not_found without null dereference", () => {
    const edgeSource = readFileSync(
      join(process.cwd(), "supabase/functions/send-user-invite/index.ts"),
      "utf8"
    );

    expect(edgeSource).toContain('if (usuarioId && (!profile || !profile.auth_user_id))');
    expect(edgeSource).toContain('error: "profile_not_found"');
    expect(edgeSource).toContain('return logAndRespond("profile_not_found", 404');
    expect(edgeSource).toContain('const inviteAuditAction =');
    expect(edgeSource).toContain('action: inviteAuditAction');
  });

  test("applies the official global-admin and RBAC semantics in send-user-invite", () => {
    const edgeSource = readFileSync(
      join(process.cwd(), "supabase/functions/send-user-invite/index.ts"),
      "utf8"
    );

    expect(edgeSource).toContain('return "users.view";');
    expect(edgeSource).toContain('roles!inner(code,is_active)');
    expect(edgeSource).toContain('eq("is_primary", true)');
    expect(edgeSource).toContain("empresa_id.is.null");
    expect(edgeSource).toContain("roles?.is_active !== false");
    expect(edgeSource).toContain("permission_denied");
    expect(edgeSource).toContain("usuarioId || profile?.id || existingUser?.id || null");
    expect(edgeSource).toContain("status: \"success\"");
  });

  test("creates pending audit rows before mutating operations and finalizes them in-place", () => {
    const edgeSource = readFileSync(
      join(process.cwd(), "supabase/functions/send-user-invite/index.ts"),
      "utf8"
    );

    expect(edgeSource).toContain('const SUPPORTED_ACTIONS = new Set');
    expect(edgeSource).toContain('normalizeSupportedAction');
    expect(edgeSource).toContain('createPendingAuditRecord');
    expect(edgeSource).toContain('finalizeAuditRecord');
    expect(edgeSource).toContain('status: "pending"');
    expect(edgeSource).toContain('throw new Error("audit_update_failed")');
    expect(edgeSource).toContain('const inviteAuditId = await createPendingAuditRecord');
    expect(edgeSource).toContain('const auditId = await createPendingAuditRecord');
  });

  test("rejects unsupported actions before invite execution and keeps supported event types mapped correctly", () => {
    const edgeSource = readFileSync(
      join(process.cwd(), "supabase/functions/send-user-invite/index.ts"),
      "utf8"
    );

    expect(edgeSource).toContain('return logAndRespond("invalid_action", 400');
    expect(edgeSource).toContain('throw new Error("invalid_action")');
    expect(edgeSource).toContain('case "status":');
    expect(edgeSource).toContain('return "read";');
    expect(edgeSource).toContain('case "update_email":');
    expect(edgeSource).toContain('return "update";');
    expect(edgeSource).toContain('case "invite":');
    expect(edgeSource).toContain('return "create";');
  });
});
