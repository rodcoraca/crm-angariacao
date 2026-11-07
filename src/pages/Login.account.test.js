import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Login from "./Login";
import { supabase } from "../supabase";
import {
  checkLoginAccountStatus,
  loadAuthorizationProfileByAuthUserId,
  requestPasswordReset,
  resolveLoginEmail,
  signInWithPassword,
  signInWithUsername,
  signOutAuthSession
} from "../modules/auth/services";

jest.mock("../modules/auth/services", () => {
  const actual = jest.requireActual("../modules/auth/services");

  return {
    ...actual,
    checkLoginAccountStatus: jest.fn(),
    loadAuthorizationProfileByAuthUserId: jest.fn(),
    reconcilePendingActivation: jest.fn(),
    resolveLoginEmail: jest.fn(),
    signInWithPassword: jest.fn(),
    signInWithUsername: jest.fn(),
    signOutAuthSession: jest.fn(),
    requestPasswordReset: jest.fn()
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
    signInWithUsername.mockResolvedValue({
      data: {
        user: { id: "auth-user-2", email: "username-user@example.com", user_metadata: {} },
        session: { expires_at: 456 }
      },
      error: null
    });
    signOutAuthSession.mockResolvedValue({ error: null });
    requestPasswordReset.mockResolvedValue({ error: null });
    checkLoginAccountStatus.mockResolvedValue({ status: "unknown", error: null });
    supabase.from.mockReturnValue({
      select: jest.fn().mockResolvedValue({ count: 0, error: null })
    });
  });

  test("uses the username login path for non-email identifiers without resolving a public email first", async () => {
    const setUser = jest.fn();
    loadAuthorizationProfileByAuthUserId.mockResolvedValue({
      data: {
        id: "profile-2",
        auth_user_id: "auth-user-2",
        empresa_id: "empresa-1",
        ativo: true,
        account_status: "active",
        email: "username-user@example.com"
      },
      error: null
    });

    render(<Login setUser={setUser} />);
    fireEvent.change(screen.getByPlaceholderText("Email ou User name"), {
      target: { value: "username-user" }
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(signInWithUsername).toHaveBeenCalledWith("username-user", "password"));
    await waitFor(() => expect(signInWithPassword).not.toHaveBeenCalled());
    await waitFor(() => expect(resolveLoginEmail).not.toHaveBeenCalled());
    await waitFor(() => expect(setUser).toHaveBeenCalledTimes(1));
  });

  test.each([
    { account_status: "disabled", ativo: true },
    { account_status: "active", ativo: false }
  ])("blocks a disabled account only after authentication when the loaded profile is inactive: %s", async (profile) => {
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

    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(loadAuthorizationProfileByAuthUserId).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(signOutAuthSession).toHaveBeenCalledTimes(1));
    expect(setUser).not.toHaveBeenCalled();
    expect(onLogin).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledWith(expect.stringContaining("Conta desativada"));
    expect(checkLoginAccountStatus).not.toHaveBeenCalled();
  });

  test("keeps the post-authentication profile check for a disabled account", async () => {
    const { notifyError } = require("../components/ui/feedbackBus");
    checkLoginAccountStatus.mockResolvedValue({ status: "active", error: null });
    loadAuthorizationProfileByAuthUserId.mockResolvedValue({
      data: { account_status: "disabled", ativo: true, id: "profile-1" },
      error: null
    });

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText("Email ou User name"), {
      target: { value: "user@example.com" }
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(signOutAuthSession).toHaveBeenCalledTimes(1));
    expect(signInWithPassword).toHaveBeenCalledTimes(1);
    expect(notifyError).toHaveBeenCalledWith(expect.stringContaining("Conta desativada"));
  });

  test("allows pending activation to proceed to authentication and reconciles it after login", async () => {
    const { reconcilePendingActivation } = require("../modules/auth/services");
    loadAuthorizationProfileByAuthUserId.mockResolvedValue({
      data: {
        id: "profile-1",
        auth_user_id: "auth-user-1",
        empresa_id: "empresa-1",
        ativo: true,
        account_status: "pending_activation",
        email: "user@example.com"
      },
      error: null
    });
    reconcilePendingActivation.mockResolvedValue({
      data: {
        id: "profile-1",
        auth_user_id: "auth-user-1",
        empresa_id: "empresa-1",
        ativo: true,
        account_status: "active",
        email: "user@example.com"
      },
      error: null,
      updated: true
    });

    const setUser = jest.fn();
    render(<Login setUser={setUser} />);
    fireEvent.change(screen.getByPlaceholderText("Email ou User name"), {
      target: { value: "user@example.com" }
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(reconcilePendingActivation).toHaveBeenCalledWith(
      expect.objectContaining({ id: "auth-user-1" }),
      expect.objectContaining({ id: "profile-1" }),
      { passwordAuthenticated: true }
    ));
    expect(setUser).toHaveBeenCalledTimes(1);
    expect(signOutAuthSession).not.toHaveBeenCalled();
    expect(checkLoginAccountStatus).not.toHaveBeenCalled();
  });

  test("allows a disabled account to be evaluated only after real authentication", async () => {
    const { notifyError } = require("../components/ui/feedbackBus");
    loadAuthorizationProfileByAuthUserId.mockResolvedValue({
      data: { account_status: "disabled", ativo: true, id: "profile-1" },
      error: null
    });

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText("Email ou User name"), {
      target: { value: "user@example.com" }
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrong-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(loadAuthorizationProfileByAuthUserId).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(expect.stringContaining("Conta desativada")));
    expect(signOutAuthSession).toHaveBeenCalledTimes(1);
    expect(checkLoginAccountStatus).not.toHaveBeenCalled();
  });

  test("keeps recovery and bootstrap buttons visible and functional for an active account", async () => {
    const { notifyError } = require("../components/ui/feedbackBus");
    checkLoginAccountStatus.mockResolvedValue({ status: "active", error: null });
    loadAuthorizationProfileByAuthUserId.mockResolvedValue({
      data: { account_status: "active", ativo: true, id: "profile-1" },
      error: null
    });
    const setUser = jest.fn();

    render(<Login setUser={setUser} />);
    fireEvent.change(screen.getByPlaceholderText("Email ou User name"), {
      target: { value: "user@example.com" }
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(setUser).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Recuperar password" }).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "Criar primeiro administrador" }).disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Recuperar password" }));
    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith(
      "user@example.com",
      expect.any(String)
    ));

    await waitFor(() => expect(screen.getByRole("button", { name: "Recuperar password" }).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Criar primeiro administrador" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Criar administrador" })).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Criar administrador" }));
    expect(notifyError).toHaveBeenCalledWith("Preencha nome, apelido e email para criar o administrador.");
  });

  test("keeps the buttons visible for invalid credentials", async () => {
    const { notifyError } = require("../components/ui/feedbackBus");
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "invalid_credentials", message: "Invalid login credentials" }
    });

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText("Email ou User name"), {
      target: { value: "user@example.com" }
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrong-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(
      "Credenciais inválidas. Verifique o email e a password."
    ));
    expect(loadAuthorizationProfileByAuthUserId).not.toHaveBeenCalled();
    expect(signOutAuthSession).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Recuperar password" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Criar primeiro administrador" })).not.toBeNull();
  });

  test("prevents access when the profile load fails after authentication", async () => {
    const { notifyError } = require("../components/ui/feedbackBus");
    loadAuthorizationProfileByAuthUserId.mockResolvedValue({
      data: null,
      error: { code: "profile_missing", message: "Perfil não encontrado" }
    });

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText("Email ou User name"), {
      target: { value: "user@example.com" }
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(
      "Erro interno ao carregar o perfil do utilizador."
    ));
    expect(signInWithPassword).toHaveBeenCalledTimes(1);
    expect(signOutAuthSession).not.toHaveBeenCalled();
  });

  test("requests a password reset for a disabled account without revealing its state", async () => {
    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText("Email ou User name"), {
      target: { value: "user@example.com" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Recuperar password" }));

    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith(
      "user@example.com",
      expect.any(String)
    ));
    expect(checkLoginAccountStatus).not.toHaveBeenCalled();
  });

  test("requests a password reset for an active account", async () => {
    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText("Email ou User name"), {
      target: { value: "user@example.com" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Recuperar password" }));

    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith(
      "user@example.com",
      expect.any(String)
    ));
    expect(checkLoginAccountStatus).not.toHaveBeenCalled();
  });

  test("requests a password reset for a pending activation account", async () => {
    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText("Email ou User name"), {
      target: { value: "user@example.com" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Recuperar password" }));

    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith(
      "user@example.com",
      expect.any(String)
    ));
    expect(checkLoginAccountStatus).not.toHaveBeenCalled();
  });

  test("keeps the create administrator action enabled in bootstrap mode", async () => {
    render(<Login />);
    fireEvent.click(screen.getByRole("button", { name: "Criar primeiro administrador" }));

    const createButton = await screen.findByRole("button", { name: "Criar administrador" });
    expect(createButton.disabled).toBe(false);
  });

});
