import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Login from "./Login";
import { supabase } from "../supabase";

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
});
