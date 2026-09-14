import { supabase } from "../../../supabase";

export async function enviarEscalaPublicadaPorEmail({ user, escalaId, tipo }) {
  if (!user?.id) {
    return { data: null, error: new Error("Sessão de utilizador inválida.") };
  }
  if (!escalaId || !["servico", "plantao"].includes(tipo)) {
    return { data: null, error: new Error("Escala publicada inválida.") };
  }

  const { data, error } = await supabase.functions.invoke("send-published-schedule-email", {
    body: { escalaId, tipo }
  });
  if (error) return { data: null, error };
  if (!data?.ok && !data?.enviados) {
    return { data, error: new Error(data?.error || "Não foi possível enviar a escala.") };
  }
  return { data, error: null };
}
