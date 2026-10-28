import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Login from "./Login";
import { supabase } from "../supabase";
import {
  loadAuthorizationProfileByAuthUserId,
  resolveLoginEmail,
  signInWithPassword,
  signOutAuthSession
} from "../modules/auth/services";

jest.mock("../modules/auth/services", () => {
  const actual = jest.requireActual("../modules/auth/services");

  return {
    ...actual,
    loadAuthorizationProfileByAuthUserId: jest.fn(),
    resolveLoginEmail: jest.fn(),
    signInWithPassword: jest.fn(),
    signOutAuthSession: jest.fn()
  };
});

jest.mock("../theme/ThemeContext", () => ({
  useTheme: () => jest.requireActual("../theme/theme").theme
}));

jest.mock("../supabase", () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn()
    }
  }
}));

jest.mock("../modules/audit/services", () => ({
  registrarLogin: jest.fn()
}));

jest.mock("../components/ui/feedbackBus", () => ({
  notifyError: jest.fn(),
  notifySuccess: jest.fn()
}));

describe("Login account status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveLoginEmail.mockResolvedValue({ email: "user@example.com" });
    signInWithPassword.mockResolvedValue({
      data: {
        user: { id: "auth-user-1", email: "user@example.com", user_metadata: {} },
        session: { expires_at: 123 }
      },
      error: null
    });
    signOutAuthSession.mockResolvedValue({ error: null });
    supabase.from.mockReturnValue({
      select: jest.fn().mockResolvedValue({ count: 0, error: null })
    });
  });

  test.each([
    { account_status: "disabled", ativo: true },
    { account_status: "active", ativo: false }
  ])("blocks entry, shows the disabled-account message and signs out for %s", async (profile) => {
    const { notifyError } = require("../components/ui/feedbackBus");
    loadAuthorizationProfileByAuthUserId.mockResolvedValue({ data: profile, error: null });
    const setUser = jest.fn();
    const onLogin = jest.fn();

    render(<Login setUser={setUser} onLogin={onLogin} />);
    fireEvent.change(screen.getByPlaceholderText("Email ou User name"), {
      target: { value: "user@example.com" }
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(signOutAuthSession).toHaveBeenCalledTimes(1));
    expect(setUser).not.toHaveBeenCalled();
    expect(onLogin).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledWith(expect.stringContaining("Conta desativada"));
    expect(notifyError).toHaveBeenCalledWith(expect.stringContaining("A sua conta encontra-se desativada"));
  });

  test("keeps recovery and bootstrap buttons visible but disabled", () => {
    render(<Login />);

    expect(screen.getByRole("button", { name: "Recuperar password" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Criar primeiro administrador" }).disabled).toBe(true);
  });

});
