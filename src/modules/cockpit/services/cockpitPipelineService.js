import { supabase } from "../../../supabase";
import { countRows } from "./sharedQueries";

export async function fetchCockpitPipeline() {
  const [novoCount, contactadoCount, agendadoCount, fechadoCount] = await Promise.all([
    countRows(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "novo")
    ),
    countRows(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "contactado")
    ),
    countRows(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "agendado")
    ),
    countRows(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "fechado")
    )
  ]);

  return {
    "pipeline-novo": String(novoCount),
    "pipeline-contactado": String(contactadoCount),
    "pipeline-agendado": String(agendadoCount),
    "pipeline-fechado": String(fechadoCount)
  };
}
