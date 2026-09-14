import { enviarEscalaPublicadaPorEmail } from "./emailService";
import { supabase } from "../../../supabase";

jest.mock("../../../supabase", () => ({
  supabase: { functions: { invoke: jest.fn() } }
}));

describe("emailService", () => {
  beforeEach(() => {
    supabase.functions.invoke.mockReset();
  });

  it("invoca a Edge Function central com a identidade publicada e o tipo", async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: { ok: true, enviados: 2, falhados: 0, total: 2, destinatarios: [] },
      error: null,
    });

    const result = await enviarEscalaPublicadaPorEmail({
      user: { id: "user-1" },
      escalaId: "escala-1",
      tipo: "plantao",
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith("send-published-schedule-email", {
      body: { escalaId: "escala-1", tipo: "plantao" },
    });
    expect(result).toEqual(expect.objectContaining({ error: null }));
  });

  it("recusa contexto sem utilizador antes de chamar a função", async () => {
    const result = await enviarEscalaPublicadaPorEmail({ escalaId: "escala-1", tipo: "servico" });
    expect(result.error).toBeInstanceOf(Error);
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });
});
