export function createAgendaViewModel() {
  return [
    { id: "agenda-visitas", title: "Visitas", description: "Agenda de visitas planeadas para o dia.", badge: "08:45", variant: "primary", meta: "Placeholder" },
    { id: "agenda-contactos", title: "Contactos", description: "Janela reservada para contactos ativos.", badge: "11:00", variant: "success", meta: "Placeholder" },
    { id: "agenda-followup", title: "Follow-up", description: "Bloco de seguimento de propostas e respostas.", badge: "15:30", variant: "warning", meta: "Placeholder" }
  ];
}
