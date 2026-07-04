export function createAcoesViewModel() {
  return [
    { id: "acao-leads-sem-contacto", title: "Leads sem contacto", description: "Lista preparada para priorizar primeira abordagem.", badge: "9 itens", variant: "danger", meta: "Placeholder" },
    { id: "acao-followup-pendente", title: "Follow-up pendente", description: "Seguimentos pendentes para equipa comercial.", badge: "14 itens", variant: "warning", meta: "Placeholder" },
    { id: "acao-leads-sem-responsavel", title: "Leads sem responsavel", description: "Leads sem atribuicao definida para atendimento.", badge: "5 itens", variant: "neutral", meta: "Placeholder" },
    { id: "acao-confirmacao-visitas", title: "Confirmacao de visitas", description: "Visitas a confirmar no periodo operacional.", badge: "6 itens", variant: "primary", meta: "Placeholder" }
  ];
}
