import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Login from "./Login";
import { supabase } from "../supabase";
import {
  buildActivationRedirectUrl,
  getAppRedirectBaseUrl,
  loadAuthorizationProfileByAuthUserId,
  reconcilePendingActivation,
  resolveTransactionalAuthContext
} from "../modules/auth/services";

jest.mock("../modules/auth/services", () => {
  const actual = jest.requireActual("../modules/auth/services");

  return {
    ...actual,
    loadAuthorizationProfileByAuthUserId: jest.fn(),
    reconcilePendingActivation: jest.fn()
  };
});

jest.mock("../supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn()
    }
  }
}));

jest.mock("../theme/ThemeContext", () => ({
  useTheme: () => jest.requireActual("../theme/theme").theme
}));

jest.mock("../modules/audit/services", () => ({
  registrarLogin: jest.fn()
}));

jest.mock("../components/ui/feedbackBus", () => ({
  notifyError: jest.fn(),
  notifySuccess: jest.fn()
}));

describe("Login password recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.updateUser.mockResolvedValue({ error: null });
    supabase.auth.signOut.mockResolvedValue({ error: null });
  });

  async function submitRecoveryPassword() {
    render(
      <Login
        passwordRecoveryMode
        passwordRecoveryReady
        passwordRecoveryUserId="user-b"
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Nova password"), {
      target: { value: "new-password" }
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmar nova password"), {
      target: { value: "new-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Definir nova password" }));
    await waitFor(() => expect(supabase.auth.getSession).toHaveBeenCalled());
  }

  test("does not update another active user's password", async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-a" } } },
      error: null
    });

    await submitRecoveryPassword();

    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  test("updates the password only for the recovery user", async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-b" } } },
      error: null
    });

    await submitRecoveryPassword();

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "new-password" });
  });

  test("prioritizes a recovery code over any persisted browser session", () => {
    const context = resolveTransactionalAuthContext({
      location: {
        search: "?code=code-b",
        hash: "#type=recovery",
        origin: "https://app.osflow.pt"
      }
    });

    expect(context.isRecovery).toBe(true);
    expect(context.code).toBe("code-b");
    expect(context.isActivation).toBe(false);
  });

  test("uses the configured production app URL for transactional redirects", () => {
    const redirectUrl = getAppRedirectBaseUrl({
      env: { REACT_APP_APP_URL: "https://app.osflow.pt" },
      location: { hostname: "app.osflow.pt", origin: "https://app.osflow.pt" }
    });

    expect(redirectUrl).toBe("https://app.osflow.pt");
  });

  test("adds activation context while preserving existing redirect parameters", () => {
    const redirectUrl = buildActivationRedirectUrl(
      "https://app.osflow.pt/?code=invite-code&foo=bar"
    );

    const parsed = new URL(redirectUrl);
    expect(parsed.searchParams.get("code")).toBe("invite-code");
    expect(parsed.searchParams.get("foo")).toBe("bar");
    expect(parsed.searchParams.get("activation")).toBe("1");
  });

  test("accepts HTTPS on the exact production domain", () => {
    expect(buildActivationRedirectUrl("https://app.osflow.pt/")).toBe(
      "https://app.osflow.pt/?activation=1"
    );
    expect(buildActivationRedirectUrl("https://app.osflow.pt:443/path")).toBe(
      "https://app.osflow.pt/path?activation=1"
    );
  });

  test.each([
    "http://app.osflow.pt/",
    "https://evil.example/",
    "https://app.osflow.pt.evil.example/",
    "https://app.osflow.pt:8443/",
    "https://user:password@app.osflow.pt/",
    "ftp://app.osflow.pt/"
  ])("rejects an invalid activation destination: %s", (redirectTo) => {
    expect(() => buildActivationRedirectUrl(redirectTo)).toThrow();
  });

  test.each([
    "http://localhost:3000/",
    "http://localhost:3001/path",
    "https://127.0.0.1:3000/"
  ])("accepts an allowed local development destination: %s", (redirectTo) => {
    expect(new URL(buildActivationRedirectUrl(redirectTo)).searchParams.get("activation")).toBe("1");
  });

  test.each([
    "http://localhost:8080/",
    "http://127.0.0.1:4000/",
    "https://localhost:8443/"
  ])("rejects an unapproved local development port: %s", (redirectTo) => {
    expect(() => buildActivationRedirectUrl(redirectTo)).toThrow();
  });

  test("does not duplicate the activation parameter", () => {
    const redirectUrl = buildActivationRedirectUrl(
      "https://app.osflow.pt/?activation=1&activation=1&foo=bar"
    );

    const parsed = new URL(redirectUrl);
    expect(parsed.searchParams.getAll("activation")).toEqual(["1"]);
    expect(parsed.searchParams.get("foo")).toBe("bar");
  });

  test("uses the application destination when activation redirect is omitted", () => {
    const redirectUrl = buildActivationRedirectUrl();

    expect(new URL(redirectUrl).searchParams.get("activation")).toBe("1");
  });

  test("keeps recovery links distinct from activation links", () => {
    const recoveryContext = resolveTransactionalAuthContext({
      search: "?code=recovery-code",
      hash: "#type=recovery"
    });

    expect(recoveryContext.isRecovery).toBe(true);
    expect(recoveryContext.isActivation).toBe(false);
  });

  test("activates only after the recovery password update succeeds", async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-b",
            email_confirmed_at: "2026-10-13T10:00:00.000Z"
          }
        }
      },
      error: null
    });
    loadAuthorizationProfileByAuthUserId.mockResolvedValue({
      data: {
        id: "profile-b",
        auth_user_id: "user-b",
        empresa_id: "empresa-b",
        ativo: true,
        account_status: "pending_activation",
        activated_at: null
      },
      error: null
    });
    reconcilePendingActivation.mockResolvedValue({
      data: { id: "profile-b", account_status: "active" },
      error: null,
      updated: true
    });

    render(
      <Login
        passwordRecoveryMode
        passwordRecoveryReady
        passwordRecoveryUserId="user-b"
        passwordRecoveryActivation
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Nova password"), {
      target: { value: "new-password" }
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmar nova password"), {
      target: { value: "new-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Definir nova password" }));

    await waitFor(() => expect(reconcilePendingActivation).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-b" }),
      expect.objectContaining({ id: "profile-b" }),
      { onboardingCompleted: true }
    ));
  });

  test("does not report activation success when the activation update fails", async () => {
    const { notifyError, notifySuccess } = require("../components/ui/feedbackBus");
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-b",
            email_confirmed_at: "2026-10-13T10:00:00.000Z"
          }
        }
      },
      error: null
    });
    loadAuthorizationProfileByAuthUserId.mockResolvedValue({
      data: {
        id: "profile-b",
        auth_user_id: "user-b",
        empresa_id: "empresa-b",
        ativo: true,
        account_status: "pending_activation",
        activated_at: null
      },
      error: null
    });
    reconcilePendingActivation.mockResolvedValue({
      data: null,
      error: { code: "activation_failed", message: "Falha de atualização" },
      updated: false
    });

    render(
      <Login
        passwordRecoveryMode
        passwordRecoveryReady
        passwordRecoveryUserId="user-b"
        passwordRecoveryActivation
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Nova password"), {
      target: { value: "new-password" }
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmar nova password"), {
      target: { value: "new-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Definir nova password" }));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(
      "A password foi definida, mas não foi possível concluir a ativação da conta."
    ));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  test("activation context for user B has priority over a persisted session for user A", async () => {
    const activationContext = resolveTransactionalAuthContext({
      location: {
        search: "?code=activation-b&activation=1",
        hash: "#type=invite",
        origin: "https://app.osflow.pt"
      }
    });

    expect(activationContext.isRecovery).toBe(true);
    expect(activationContext.isActivation).toBe(true);
    expect(activationContext.code).toBe("activation-b");

    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-a" } } },
      error: null
    });

    render(
      <Login
        passwordRecoveryMode
        passwordRecoveryReady
        passwordRecoveryUserId="user-b"
        passwordRecoveryActivation
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Nova password"), {
      target: { value: "new-password" }
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmar nova password"), {
      target: { value: "new-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Definir nova password" }));

    await waitFor(() => expect(supabase.auth.getSession).toHaveBeenCalled());

    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });
});
