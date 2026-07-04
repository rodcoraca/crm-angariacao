import { supabase } from "../../../supabase";
import { fetchRows } from "./sharedQueries";

export async function fetchCockpitAgenda() {
  const limite = 5;
  const camposAgenda = "id,nome,telefone,status,data_visita,hora_visita,local_visita,status_visita,created_at";
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const inicioAmanha = new Date(inicioHoje);
  inicioAmanha.setDate(inicioAmanha.getDate() + 1);

  const [visitasHoje, visitasFuturas, agendadasSemData] = await Promise.all([
    fetchRows(
      supabase
        .from("leads")
        .select(camposAgenda)
        .eq("status", "agendado")
        .gte("data_visita", inicioHoje.toISOString())
        .lt("data_visita", inicioAmanha.toISOString())
        .order("data_visita", { ascending: true })
        .limit(limite)
    ),
    fetchRows(
      supabase
        .from("leads")
        .select(camposAgenda)
        .eq("status", "agendado")
        .gte("data_visita", inicioAmanha.toISOString())
        .order("data_visita", { ascending: true })
        .limit(limite)
    ),
    fetchRows(
      supabase
        .from("leads")
        .select(camposAgenda)
        .eq("status", "agendado")
        .is("data_visita", null)
        .order("created_at", { ascending: true })
        .limit(limite)
    )
  ]);

  return {
    visitasHoje,
    visitasFuturas,
    agendadasSemData
  };
}
