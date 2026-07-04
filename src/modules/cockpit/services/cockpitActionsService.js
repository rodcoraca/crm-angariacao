import { supabase } from "../../../supabase";
import { fetchLeadsConfirmacaoVisitas, fetchRows } from "./sharedQueries";

export async function fetchCockpitActions() {
  const limite = 5;
  const camposBase = "id,nome,telefone,created_at,data_visita,hora_visita,local_visita,status_visita";
  const camposFollowup = "id,nome,telefone,updated_at,data_visita,hora_visita,local_visita,status_visita";
  const dataLimiteFollowup = new Date();
  dataLimiteFollowup.setDate(dataLimiteFollowup.getDate() - 3);

  const [leadsSemContacto, followupPendente, leadsSemResponsavel, confirmacaoVisitas] = await Promise.all([
    fetchRows(
      supabase
        .from("leads")
        .select(camposBase)
        .eq("status", "novo")
        .order("created_at", { ascending: true })
        .limit(limite)
    ),
    fetchRows(
      supabase
        .from("leads")
        .select(camposFollowup)
        .eq("status", "contactado")
        .lt("updated_at", dataLimiteFollowup.toISOString())
        .order("updated_at", { ascending: true })
        .limit(limite)
    ),
    fetchRows(
      supabase
        .from("leads")
        .select(camposBase)
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
