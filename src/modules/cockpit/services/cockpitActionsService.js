import { supabase } from "../../../supabase";
import { fetchLeadsConfirmacaoVisitas, fetchRows } from "./sharedQueries";

export async function fetchCockpitActions() {
  const limite = 5;
  const dataLimiteFollowup = new Date();
  dataLimiteFollowup.setDate(dataLimiteFollowup.getDate() - 3);

  const [leadsSemContacto, followupPendente, leadsSemResponsavel, confirmacaoVisitas] = await Promise.all([
    fetchRows(
      supabase
        .from("leads")
        .select("id,nome,telefone,created_at")
        .eq("status", "novo")
        .order("created_at", { ascending: true })
        .limit(limite)
    ),
    fetchRows(
      supabase
        .from("leads")
        .select("id,nome,telefone,updated_at")
        .eq("status", "contactado")
        .lt("updated_at", dataLimiteFollowup.toISOString())
        .order("updated_at", { ascending: true })
        .limit(limite)
    ),
    fetchRows(
      supabase
        .from("leads")
        .select("id,nome,telefone,created_at")
        .or("agente_id.is.null,agente_id.eq.")
        .order("created_at", { ascending: true })
        .limit(limite)
    ),
    fetchLeadsConfirmacaoVisitas(supabase, limite)
  ]);

  return {
    leadsSemContacto,
    followupPendente,
    leadsSemResponsavel,
    confirmacaoVisitas
  };
}
