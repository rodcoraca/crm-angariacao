import { supabase } from "../../../supabase";

const TELEMETRY_TABLE = "logs_navegacao";

export async function registrarNavegacao({ userId, acao, detalhes }) {
  if (!userId || !acao) {
    return { ok: false, reason: "missing_user_or_action" };
  }

  try {
    await supabase
      .from(TELEMETRY_TABLE)
      .insert([
        {
          usuario_id: userId,
          acao,
          detalhes: detalhes || "",
          created_at: new Date().toISOString()
        }
      ]);

    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}