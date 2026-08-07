import { supabase } from "../../../supabase";
import { resolveEmpresaId } from "../../../utils/empresaScope";

/**
 * Carrega o perfil de sincronização guardado para uma empresa + provider.
 * Devolve null se não existir.
 */
export async function loadProfile(provider) {
  const empresaId = await resolveEmpresaId();
  if (!empresaId) return null;

  const { data, error } = await supabase
    .from("provider_sync_profiles")
    .select("config")
    .eq("empresa_id", empresaId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    console.error("[ProviderSyncProfileService] Erro ao carregar perfil:", error);
    return null;
  }

  return data?.config ?? null;
}

/**
 * Grava (upsert) o perfil de sincronização para uma empresa + provider.
 */
export async function saveProfile(provider, config) {
  const empresaId = await resolveEmpresaId();
  if (!empresaId) {
    console.error("[ProviderSyncProfileService] empresa_id não resolvido — perfil não guardado.");
    return;
  }

  const { error } = await supabase
    .from("provider_sync_profiles")
    .upsert(
      {
        empresa_id: empresaId,
        provider,
        config,
        updated_at: new Date().toISOString()
      },
      { onConflict: "empresa_id,provider" }
    );

  if (error) {
    console.error("[ProviderSyncProfileService] Erro ao guardar perfil:", error);
  }
}
