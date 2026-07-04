export function mapCockpitActionsData(raw) {
  const {
    leadsSemContacto = [],
    followupPendente = [],
    leadsSemResponsavel = [],
    confirmacaoVisitas = []
  } = raw || {};

  return [
    ...leadsSemContacto.map((lead) => ({
      id: `acao-sem-contacto-${lead.id}`,
      icone: "1",
      titulo: lead.nome || "Lead sem nome",
      prioridade: "Alta",
      dataRef: lead.created_at,
      telefone: lead.telefone,
      categoria: "Leads sem contacto"
    })),
    ...followupPendente.map((lead) => ({
      id: `acao-followup-${lead.id}`,
      icone: "2",
      titulo: lead.nome || "Lead sem nome",
      prioridade: "Media",
      dataRef: lead.updated_at,
      telefone: lead.telefone,
      categoria: "Follow-up pendente"
    })),
    ...leadsSemResponsavel.map((lead) => ({
      id: `acao-sem-responsavel-${lead.id}`,
      icone: "3",
      titulo: lead.nome || "Lead sem nome",
      prioridade: "Alta",
      dataRef: lead.created_at,
      telefone: lead.telefone,
      categoria: "Leads sem responsavel"
    })),
    ...confirmacaoVisitas.map((lead) => ({
      id: `acao-confirmacao-visita-${lead.id}`,
      icone: "4",
      titulo: lead.nome || "Lead sem nome",
      prioridade: "Media",
      dataRef: lead.data_visita || lead.created_at,
      telefone: lead.telefone,
      categoria: "Confirmacao de visitas"
    }))
  ];
}
