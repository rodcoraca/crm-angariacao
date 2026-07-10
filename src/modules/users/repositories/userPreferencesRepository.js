import { supabase } from "../../../supabase";

const USER_PREFERENCES_TABLE = "user_preferences";

const SELECT_COLUMNS = "user_id,idioma,tema,pagina_inicial,formato_data,notificacoes,created_at,updated_at";

export function fetchUserPreferencesByUserId(userId) {
  if (!userId) {
    return Promise.resolve({ data: null, error: null });
  }

  return supabase
    .from(USER_PREFERENCES_TABLE)
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
}

export function upsertUserPreferencesByUserId({
  userId,
  idioma,
  tema,
  paginaInicial,
  formatoData,
  notificacoes,
}) {
  if (!userId) {
    return Promise.resolve({ data: null, error: null });
  }

  const payload = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  if (idioma !== undefined) payload.idioma = idioma;
  if (tema !== undefined) payload.tema = tema;
  if (paginaInicial !== undefined) payload.pagina_inicial = paginaInicial;
  if (formatoData !== undefined) payload.formato_data = formatoData;
  if (notificacoes !== undefined) payload.notificacoes = notificacoes;

  return supabase
    .from(USER_PREFERENCES_TABLE)
    .upsert([payload], { onConflict: "user_id" })
    .select(SELECT_COLUMNS)
    .maybeSingle();
}
