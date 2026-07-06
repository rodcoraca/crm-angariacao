export function emojiTipoLead(tipo) {
  if (tipo === "quente") return "🔥";
  if (tipo === "morno") return "🟡";
  return "❄️";
}

export function formatarDataLeadCard(data) {
  if (!data) return "";

  const d = new Date(data);

  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();

  const hora = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const seg = String(d.getSeconds()).padStart(2, "0");

  return `${dia}/${mes}/${ano} ${hora}:${min}:${seg}`;
}

export function formatarDataDashboard(data) {
  if (!data) return "-";
  const d = new Date(data);
  if (d.getFullYear() === 1970) return "-";
  return d.toLocaleString("pt-PT");
}

export function labelTipoLead(tipo) {
  if (tipo === "quente") return "Quente";
  if (tipo === "morno") return "Morno";
  return "Frio";
}

export function badgeTipoFicha(theme, tipo) {
  const palette = {
    quente: { background: "#dcfce7", color: "#166534" },
    morno: { background: "#fef9c3", color: "#92400e" },
    frio: { background: "#fee2e2", color: "#991b1b" }
  };

  return palette[tipo] || { background: theme.colors.surfaceSoft, color: theme.colors.text };
}

export function filtrarLeadsDashboard(leads, busca, filtroTipo) {
  const termo = (busca || "").trim().toLowerCase();

  return (leads || []).filter((lead) => {
    const nomeMatch = lead.nome?.toLowerCase().includes(termo);
    const telefoneMatch = String(lead.telefone || "").replace(/\D/g, "").includes(termo.replace(/\D/g, ""));

    return (
      (filtroTipo ? lead.tipo === filtroTipo : true) &&
      (!termo || nomeMatch || telefoneMatch)
    );
  });
}

export function construirCsvLeads(leads) {
  const linhas = [
    ["Nome", "Telefone", "Tipo", "Data"],
    ...(leads || []).map((lead) => [
      lead.nome,
      lead.telefone,
      lead.tipo,
      new Date(lead.created_at).toLocaleString()
    ])
  ];

  return linhas.map((linha) => linha.join(",")).join("\n");
}
