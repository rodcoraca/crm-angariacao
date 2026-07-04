export function createKpisViewModel(theme) {
  return [
    { id: "kpi-leads-ativas", titulo: "Leads Ativas", valor: "128", variacao: "5% vs ontem", icone: "L", cor: theme.colors.primary },
    { id: "kpi-leads-sem-contacto", titulo: "Leads sem Contacto", valor: "23", variacao: "3 pendentes", icone: "C", cor: theme.colors.warning },
    { id: "kpi-leads-agendadas", titulo: "Leads Agendadas", valor: "41", variacao: "7 para hoje", icone: "A", cor: theme.colors.secondary },
    { id: "kpi-negocios-fechados", titulo: "Negocios Fechados", valor: "12", variacao: "2 esta semana", icone: "N", cor: theme.colors.success },
    { id: "kpi-imoveis-incompletos", titulo: "Imoveis Incompletos", valor: "19", variacao: "4 criticos", icone: "I", cor: theme.colors.danger },
    { id: "kpi-atividades-hoje", titulo: "Atividades Hoje", valor: "64", variacao: "em execucao", icone: "T", cor: theme.colors.accent }
  ];
}

export function composeKpis(kpisBase, kpiValues, kpiHasError) {
  return kpisBase.map((kpi) => ({
    ...kpi,
    valor: kpiValues[kpi.id] || (kpiHasError ? "--" : "...")
  }));
}
