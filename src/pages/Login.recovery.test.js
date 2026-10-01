import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Login from "./Login";
import { supabase } from "../supabase";
import { getAppRedirectBaseUrl, resolveTransactionalAuthContext } from "../modules/auth/services";

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
