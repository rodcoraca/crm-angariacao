import { reconcilePendingActivation } from "./authService";

jest.mock("../../../supabase.js", () => ({
  supabase: {}
}));

describe("activation completion", () => {
  test("does not activate a pending profile from email confirmation alone", async () => {
    const result = await reconcilePendingActivation(
      {
        id: "auth-user-1",
        email_confirmed_at: "2026-09-28T10:00:00.000Z"
      },
      {
        id: "profile-1",
        account_status: "pending_activation",
        activated_at: null
      }
    );

    expect(result).toEqual({
      data: {
        id: "profile-1",
        account_status: "pending_activation",
        activated_at: null
      },
      error: null,
      updated: false
    });
  });
});
