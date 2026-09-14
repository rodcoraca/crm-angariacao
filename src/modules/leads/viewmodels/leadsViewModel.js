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

export { getLeadStatusLabel, getLeadStatusVariant, LEAD_STATUSES } from "../statusCatalog";

export function badgeTipoFicha(theme, tipo) {
  const palette = {
    quente: { background: "var(--os-status-success-surface)", color: "var(--os-status-success-text)" },
    morno: { background: "var(--os-status-warning-surface)", color: "var(--os-status-warning-text)" },
    frio: { background: "var(--os-status-danger-surface)", color: "var(--os-status-danger-text)" }
  };

  return palette[tipo] || { background: theme.colors.surfaceSoft, color: theme.colors.text };
}

export function filtrarLeadsDashboard(leads, busca, filtroTipo, filtroUtilizador, filtroStatus = "") {
  const termo = (busca || "").trim();
  const termoNormalizado = termo.toLowerCase();

  return (leads || []).filter((lead) => {
    const nome = String(lead?.nome || "");
    const telefone = String(lead?.telefone || "");
    const nomeMatch = nome.toLowerCase().includes(termoNormalizado);
    const telefoneNormalizado = telefone.replace(/\D/g, "");
    const termoTelefoneNormalizado = termo.replace(/\D/g, "");
    const telefoneMatch = Boolean(termoTelefoneNormalizado) && telefoneNormalizado.includes(termoTelefoneNormalizado);
    const utilizadorMatch = filtroUtilizador ? String(lead?.agente_id || "") === String(filtroUtilizador) : true;

    return (
      (filtroTipo ? lead.tipo === filtroTipo : true) &&
      (filtroStatus ? lead.status === filtroStatus : true) &&
      utilizadorMatch &&
      (!termo || nomeMatch || telefoneMatch)
    );
  });
}

export function construirCsvLeads(leads) {
  const linhas = [
    ["Nome", "Telefone", "Tipo", "Estado", "Data"],
    ...(leads || []).map((lead) => [
      lead.nome,
      lead.telefone,
      lead.tipo,
      lead.status,
      new Date(lead.created_at).toLocaleString()
    ])
  ];

  return linhas.map((linha) => linha.join(",")).join("\n");
}

