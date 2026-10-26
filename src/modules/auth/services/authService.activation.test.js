import { markUserAccountActive, reconcilePendingActivation } from "./authService";

jest.mock("../../../supabase.js", () => ({
  supabase: {
    from: jest.fn()
  }
}));

describe("activation completion", () => {
  const authUser = {
    id: "auth-user-1",
    email_confirmed_at: "2026-09-28T10:00:00.000Z"
  };

  const pendingProfile = {
    id: "profile-1",
    auth_user_id: "auth-user-1",
    empresa_id: "empresa-1",
    ativo: true,
    account_status: "pending_activation",
    activated_at: null,
    permissoes: { dashboard: true }
  };

  function mockActivationUpdate(result = { data: { ...pendingProfile, account_status: "active", activated_at: "2026-10-13T10:00:00.000Z" }, error: null }) {
    const query = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue(result)
    };

    const { supabase } = require("../../../supabase.js");
    supabase.from.mockReturnValue(query);
    return query;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function expectActivationDiagnostic(code) {
    expect(console.warn).toHaveBeenCalledWith(
      "[ActivationDiagnostics]",
      expect.objectContaining({ code })
    );
  }

  test("activates only after confirmed email and password onboarding completed", async () => {
    mockActivationUpdate();

    const result = await reconcilePendingActivation(authUser, pendingProfile, {
      onboardingCompleted: true
    });

    expect(result.error).toBeNull();
    expect(result.updated).toBe(true);
    expect(result.data).toEqual(expect.objectContaining({
      id: "profile-1",
      account_status: "active",
      ativo: true,
      permissoes: { dashboard: true }
    }));
  });

  test("activates a pending profile after a password login when the invite was accepted", async () => {
    mockActivationUpdate();

    const result = await reconcilePendingActivation(
      authUser,
      { ...pendingProfile, activation_sent_at: "2026-09-27T10:00:00.000Z" },
      { passwordAuthenticated: true }
    );

    expect(result.updated).toBe(true);
    expect(result.data.account_status).toBe("active");
  });

  test("does not activate on password login when the email was confirmed before the latest invite", async () => {
    const result = await reconcilePendingActivation(
      authUser,
      { ...pendingProfile, activation_sent_at: "2026-10-01T10:00:00.000Z" },
      { passwordAuthenticated: true }
    );

    expect(result.updated).toBe(false);
  });

  test("does not activate on password login without a confirmed email", async () => {
    const result = await reconcilePendingActivation(
      { id: "auth-user-1" },
      pendingProfile,
      { passwordAuthenticated: true }
    );

    expect(result.updated).toBe(false);
  });

  test("does not reactivate an administratively disabled account", async () => {
    const result = await reconcilePendingActivation(authUser, {
      ...pendingProfile,
      account_status: "disabled",
      ativo: false,
      activated_at: null
    }, { onboardingCompleted: true });

    expect(result.updated).toBe(false);
    expect(result.data.account_status).toBe("disabled");
  });

  test("does not activate a pending profile from email confirmation alone", async () => {
    const result = await reconcilePendingActivation(
      authUser,
      pendingProfile
    );

    expect(result).toEqual({
      data: pendingProfile,
      error: null,
      updated: false
    });
  });

  test("does not activate while restoring a session", async () => {
    const result = await reconcilePendingActivation(authUser, pendingProfile);

    expect(result.updated).toBe(false);
    expect(result.data).toEqual(pendingProfile);
  });

  test("does not activate when onboarding is incomplete or the user is disabled", async () => {
    const incomplete = await reconcilePendingActivation(authUser, pendingProfile, {
      onboardingCompleted: false
    });
    const disabled = await reconcilePendingActivation(authUser, {
      ...pendingProfile,
      ativo: false
    }, { onboardingCompleted: true });

    expect(incomplete.updated).toBe(false);
    expect(disabled.updated).toBe(false);
  });

  test("does not update an already active profile", async () => {
    const result = await reconcilePendingActivation(authUser, {
      ...pendingProfile,
      account_status: "active",
      activated_at: "2026-10-01T10:00:00.000Z"
    }, { onboardingCompleted: true });

    expect(result.updated).toBe(false);
  });

  test("communicates conditional update failures", async () => {
    mockActivationUpdate({ data: null, error: null });

    const result = await reconcilePendingActivation(authUser, pendingProfile, {
      onboardingCompleted: true
    });

    expect(result.updated).toBe(false);
    expect(result.error).toEqual(expect.objectContaining({
      code: "activation_not_applied"
    }));
  });

  test.each([
    ["onboarding_not_completed", authUser, pendingProfile, {}],
    ["email_not_confirmed", { id: "auth-user-1" }, pendingProfile, { passwordAuthenticated: true }],
    ["auth_profile_mismatch", authUser, { ...pendingProfile, auth_user_id: "another-auth-user" }, { onboardingCompleted: true }],
    ["missing_empresa_id", authUser, { ...pendingProfile, empresa_id: null }, { onboardingCompleted: true }],
    ["empresa_mismatch", { ...authUser, user_metadata: { empresa_id: "empresa-2" } }, pendingProfile, { onboardingCompleted: true }],
    ["account_not_pending", authUser, { ...pendingProfile, account_status: "active" }, { onboardingCompleted: true }],
    ["account_inactive", authUser, { ...pendingProfile, ativo: false }, { onboardingCompleted: true }],
    ["already_activated", authUser, { ...pendingProfile, activated_at: "2026-10-13T10:00:00.000Z" }, { onboardingCompleted: true }],
    ["invite_not_confirmed_after_sent", { ...authUser, email_confirmed_at: "2026-09-01T10:00:00.000Z" }, { ...pendingProfile, activation_sent_at: "2026-10-01T10:00:00.000Z" }, { passwordAuthenticated: true }]
  ])("reports %s when activation conditions are not met", async (code, auth, profile, options) => {
    const result = await reconcilePendingActivation(auth, profile, options);

    expect(result).toEqual({ data: profile, error: null, updated: false });
    expectActivationDiagnostic(code);
  });

  test("does not activate a profile belonging to another auth user", async () => {
    const result = await reconcilePendingActivation(authUser, {
      ...pendingProfile,
      auth_user_id: "another-auth-user"
    }, { onboardingCompleted: true });

    expect(result.updated).toBe(false);
  });

  test("requires the authenticated company to match the profile company", async () => {
    const mismatchedCompany = await reconcilePendingActivation({
      ...authUser,
      user_metadata: { empresa_id: "empresa-2" }
    }, pendingProfile, { onboardingCompleted: true });
    expect(mismatchedCompany.updated).toBe(false);

    mockActivationUpdate();
    const matchingCompany = await reconcilePendingActivation({
      ...authUser,
      user_metadata: { empresa_id: "empresa-1" }
    }, pendingProfile, { onboardingCompleted: true });
    expect(matchingCompany.updated).toBe(true);
  });

  test("does not activate a profile without a company", async () => {
    const result = await reconcilePendingActivation(authUser, {
      ...pendingProfile,
      empresa_id: null
    }, { onboardingCompleted: true });

    expect(result.updated).toBe(false);
  });

  test("returns an error when the profile does not exist", async () => {
    const result = await reconcilePendingActivation(authUser, null, {
      onboardingCompleted: true
    });

    expect(result.updated).toBe(false);
    expect(result.error).toEqual(expect.objectContaining({
      code: "missing_profile"
    }));
  });

  test("communicates update errors", async () => {
    mockActivationUpdate({ data: null, error: { code: "permission_denied", message: "Denied" } });

    const result = await reconcilePendingActivation(authUser, pendingProfile, {
      onboardingCompleted: true
    });

    expect(result.updated).toBe(false);
    expect(result.error).toEqual({ code: "permission_denied", message: "Denied" });
    expectActivationDiagnostic("activation_update_error");
    expect(console.warn).toHaveBeenCalledWith(
      "[ActivationDiagnostics]",
      expect.objectContaining({ supabase_error_code: "permission_denied" })
    );
  });

  test("reports an UPDATE that returned no row", async () => {
    mockActivationUpdate({ data: null, error: null });

    const result = await reconcilePendingActivation(authUser, pendingProfile, {
      onboardingCompleted: true
    });

    expect(result.updated).toBe(false);
    expect(result.error).toEqual(expect.objectContaining({ code: "activation_not_applied" }));
    expectActivationDiagnostic("activation_update_no_row");
  });

  test("reports activation only after the UPDATE returns a profile", async () => {
    mockActivationUpdate();

    const result = await reconcilePendingActivation(authUser, pendingProfile, {
      onboardingCompleted: true
    });

    expect(result.updated).toBe(true);
    expect(console.info).toHaveBeenCalledWith(
      "[ActivationDiagnostics]",
      expect.objectContaining({ code: "activation_completed" })
    );
  });

  test("refuses direct activation without onboarding completion", async () => {
    const result = await markUserAccountActive("profile-1");

    expect(result.error).toEqual(expect.objectContaining({
      code: "activation_not_completed"
    }));
  });
});
