export function formatarDataAcao(value) {
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) return "-";
  return data.toLocaleDateString("pt-PT");
}

export function formatarDescricaoAcao(item) {
  const telefone = item.telefone ? item.telefone : "Sem telefone";
  const data = item.dataRef ? formatarDataAcao(item.dataRef) : "-";
  return `${item.categoria} | Telefone: ${telefone} | Data: ${data}`;
}

export function formatarHoraAgenda(value) {
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) return "--:--";
  return data.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

export function labelEstadoAgenda(status) {
  if (!status) return "Sem estado";
  if (status === "agendado") return "Agendado";
  if (status === "contactado") return "Contactado";
  if (status === "novo") return "Novo";
  if (status === "fechado") return "Fechado";
  return status;
}

export function formatarDescricaoAgenda(item) {
  return `Telefone: ${item.telefone} | Hora: ${item.hora} | Local: ${item.local} | Estado: ${item.estado} | Data: ${item.data}`;
}

export function formatarResumoSaudeImovel(item) {
  return `Essenciais: ${item.essenciaisPreenchidos}/${item.totalEssenciais} | Documentos: ${item.documentosOk}/5 | Ficheiros: ${item.totalFicheiros}`;
}

export function obterNomeUtilizador() {
  if (typeof window === "undefined") return "Utilizador";

  const chaves = ["osflow_user_name", "user_name", "nomeUtilizador", "nome_utilizador"];

  for (const chave of chaves) {
    const valor = window.localStorage.getItem(chave) || window.sessionStorage.getItem(chave);
    if (valor && valor.trim()) return valor.trim();
  }

  return "Utilizador";
}
