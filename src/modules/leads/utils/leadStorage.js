export function recuperarLeadSelecionada() {
  if (typeof window === "undefined") return null;

  const rawLead = window.localStorage.getItem("leadSelecionado");
  if (!rawLead) return null;

  try {
    return JSON.parse(rawLead);
  } catch {
    return null;
  }
}

export function limparLeadSelecionada() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("leadSelecionado");
}
