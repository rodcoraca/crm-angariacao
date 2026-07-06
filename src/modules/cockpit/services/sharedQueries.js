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

export async function fetchLeadsConfirmacaoVisitas({ queryComData, querySemData, limite }) {

  let base = [];

  try {
    base = await fetchRows(queryComData);
  } catch {
    base = await fetchRows(querySemData);
  }

  return [...base]
    .sort((a, b) => {
      const aData = new Date(a.data_visita || a.created_at || 0).getTime();
      const bData = new Date(b.data_visita || b.created_at || 0).getTime();
      return aData - bData;
    })
    .slice(0, limite);
}
