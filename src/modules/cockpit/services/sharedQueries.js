export async function countRows(query) {
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function fetchRows(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchLeadsConfirmacaoVisitas(supabaseClient, limite) {
  const camposComDataVisita = "id,nome,telefone,created_at,data_visita,hora_visita,local_visita,status_visita";
  const camposSemDataVisita = "id,nome,telefone,created_at,hora_visita,local_visita,status_visita";

  let base = [];

  try {
    base = await fetchRows(
      supabaseClient
        .from("leads")
        .select(camposComDataVisita)
        .eq("status", "agendado")
        .order("data_visita", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .limit(50)
    );
  } catch {
    base = await fetchRows(
      supabaseClient
        .from("leads")
        .select(camposSemDataVisita)
        .eq("status", "agendado")
        .order("created_at", { ascending: true })
        .limit(50)
    );
  }

  return [...base]
    .sort((a, b) => {
      const aData = new Date(a.data_visita || a.created_at || 0).getTime();
      const bData = new Date(b.data_visita || b.created_at || 0).getTime();
      return aData - bData;
    })
    .slice(0, limite);
}
