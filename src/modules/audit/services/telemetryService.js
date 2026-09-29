import { supabase } from "../../../supabase.js";

const TELEMETRY_TABLE = "logs_navegacao";

export async function registrarNavegacao({ userId, empresaId = null, acao, detalhes }) {
  if (!userId || !acao) {
    return { ok: false, reason: "missing_user_or_action" };
  }

  try {
    await supabase
      .from(TELEMETRY_TABLE)
      .insert([
        {
          usuario_id: userId,
          empresa_id: empresaId || null,
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