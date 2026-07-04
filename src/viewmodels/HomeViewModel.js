export function createHomeViewModel(theme) {
  // ARQ-COCKPIT: KPIs OPERACIONAIS
  // Origem dos dados: agregacoes operacionais de leads, atividades e qualidade de cadastro.
  // Tabela: leads, logs_navegacao, estoque_nao_publicitado, imovel_ficheiros.
  // Campos necessarios: leads.tipo, leads.status, leads.created_at, leads.updated_at, logs_navegacao.created_at,
  //   estoque_nao_publicitado.id, estoque_nao_publicitado.updated_at, imovel_ficheiros.imovel_id.
  // Dependencias: filtros por periodo/equipa/utilizador, timezone unica, mapeamento de KPI para unidade/variacao.
  const kpis = [
    { id: "kpi-leads-ativas", titulo: "Leads Ativas", valor: "128", variacao: "5% vs ontem", icone: "L", cor: theme.colors.primary },
    { id: "kpi-leads-sem-contacto", titulo: "Leads sem Contacto", valor: "23", variacao: "3 pendentes", icone: "C", cor: theme.colors.warning },
    { id: "kpi-leads-agendadas", titulo: "Leads Agendadas", valor: "41", variacao: "7 para hoje", icone: "A", cor: theme.colors.secondary },
    { id: "kpi-negocios-fechados", titulo: "Negocios Fechados", valor: "12", variacao: "2 esta semana", icone: "N", cor: theme.colors.success },
    { id: "kpi-imoveis-incompletos", titulo: "Imoveis Incompletos", valor: "19", variacao: "4 criticos", icone: "I", cor: theme.colors.danger },
    { id: "kpi-atividades-hoje", titulo: "Atividades Hoje", valor: "64", variacao: "em execucao", icone: "T", cor: theme.colors.accent }
  ];

  // ARQ-COCKPIT: ACOES IMEDIATAS
  // Origem dos dados: fila de priorizacao operacional gerada por regras de pendencia.
  // Tabela: leads.
  // Campos necessarios: leads.id, leads.nome, leads.telefone, leads.status, leads.agente_id, leads.updated_at, leads.created_at.
  // Dependencias: regras de prioridade (SLA), atribuicao de responsavel, estado do funil e ordenacao por urgencia.
  const acoesImediatas = [
    { id: "acao-leads-sem-contacto", title: "Leads sem contacto", description: "Lista preparada para priorizar primeira abordagem.", badge: "9 itens", variant: "danger", meta: "Placeholder" },
    { id: "acao-followup-pendente", title: "Follow-up pendente", description: "Seguimentos pendentes para equipa comercial.", badge: "14 itens", variant: "warning", meta: "Placeholder" },
    { id: "acao-leads-sem-responsavel", title: "Leads sem responsavel", description: "Leads sem atribuicao definida para atendimento.", badge: "5 itens", variant: "neutral", meta: "Placeholder" },
    { id: "acao-confirmacao-visitas", title: "Confirmacao de visitas", description: "Visitas a confirmar no periodo operacional.", badge: "6 itens", variant: "primary", meta: "Placeholder" }
  ];

  // ARQ-COCKPIT: AGENDA OPERACIONAL
  // Origem dos dados: compromissos operacionais consolidados por janela temporal.
  // Tabela: leads (status/agendamentos) e/ou agenda_operacional (quando existir modulo dedicado).
  // Campos necessarios: leads.id, leads.nome, leads.status, leads.updated_at, agenda_operacional.data, agenda_operacional.hora.
  // Dependencias: calendario diario, timezone, filtros por utilizador/equipa e ordenacao cronologica.
  const agendaOperacional = [
    { id: "agenda-visitas", title: "Visitas", description: "Agenda de visitas planeadas para o dia.", badge: "08:45", variant: "primary", meta: "Placeholder" },
    { id: "agenda-contactos", title: "Contactos", description: "Janela reservada para contactos ativos.", badge: "11:00", variant: "success", meta: "Placeholder" },
    { id: "agenda-followup", title: "Follow-up", description: "Bloco de seguimento de propostas e respostas.", badge: "15:30", variant: "warning", meta: "Placeholder" }
  ];

  // ARQ-COCKPIT: PIPELINE
  // Origem dos dados: distribuicao de leads por etapa comercial.
  // Tabela: leads.
  // Campos necessarios: leads.id, leads.status, leads.tipo, leads.created_at, leads.updated_at.
  // Dependencias: dicionario oficial de status (novo/contactado/agendado/fechado) e consistencia de transicoes.
  const pipeline = [
    { id: "pipeline-novo", label: "Novo", value: "38", hint: "Placeholder" },
    { id: "pipeline-contactado", label: "Contactado", value: "29", hint: "Placeholder" },
    { id: "pipeline-agendado", label: "Agendado", value: "17", hint: "Placeholder" },
    { id: "pipeline-fechado", label: "Fechado", value: "12", hint: "Placeholder" }
  ];

  // ARQ-COCKPIT: IMOVEIS EM RISCO
  // Origem dos dados: qualidade documental e completude de cadastro de imoveis.
  // Tabela: estoque_nao_publicitado, imovel_ficheiros.
  // Campos necessarios: estoque_nao_publicitado.id, estoque_nao_publicitado.updated_at,
  //   estoque_nao_publicitado.cmi, estoque_nao_publicitado.caderneta_predial, estoque_nao_publicitado.plantas,
  //   estoque_nao_publicitado.certificado_energetico, estoque_nao_publicitado.cartao_cidadao, imovel_ficheiros.imovel_id.
  // Dependencias: regra de completude documental, validacao de campos obrigatorios e janela de expiracao de risco.
  const imoveisRisco = [
    { id: "risco-documentacao-incompleta", title: "Documentacao incompleta", description: "Processos com documentos em falta para validacao.", badge: "11", variant: "danger", meta: "Placeholder" },
    { id: "risco-dados-em-falta", title: "Dados em falta", description: "Registos com campos essenciais por completar.", badge: "7", variant: "warning", meta: "Placeholder" },
    { id: "risco-sem-ficheiros", title: "Sem ficheiros", description: "Imoveis sem anexos obrigatorios carregados.", badge: "4", variant: "neutral", meta: "Placeholder" }
  ];

  // ARQ-COCKPIT: PRODUTIVIDADE
  // Origem dos dados: atividade de producao operacional por periodo.
  // Tabela: leads, logs_navegacao.
  // Campos necessarios: leads.id, leads.created_at, leads.updated_at, leads.status, logs_navegacao.usuario_id, logs_navegacao.created_at.
  // Dependencias: definicao de conversao, regra de tempo medio e recorte temporal por dia/semana/mes.
  const produtividade = [
    { id: "prod-leads-criadas", label: "Leads criadas", value: "24", hint: "Hoje" },
    { id: "prod-leads-atualizadas", label: "Leads atualizadas", value: "37", hint: "Hoje" },
    { id: "prod-conversao", label: "Conversao", value: "18%", hint: "Placeholder" },
    { id: "prod-tempo-medio", label: "Tempo medio", value: "14m", hint: "Placeholder" }
  ];

  // ARQ-COCKPIT: ULTIMAS ATIVIDADES
  // Origem dos dados: trilha cronologica de eventos operacionais.
  // Tabela: logs_navegacao; opcionalmente leads e estoque_nao_publicitado para enriquecimento semantico.
  // Campos necessarios: logs_navegacao.id, logs_navegacao.usuario_id, logs_navegacao.acao,
  //   logs_navegacao.detalhes, logs_navegacao.created_at.
  // Dependencias: normalizacao de tipos de evento, lookup de utilizador e ordenacao desc por created_at.
  const ultimasAtividades = [
    { id: "atividade-login", title: "Login", description: "Acesso ao Cockpit Executivo registado.", badge: "Agora", variant: "primary", meta: "Placeholder" },
    { id: "atividade-atualizacao", title: "Atualizacao", description: "Registo atualizado no fluxo comercial.", badge: "Ha 12 min", variant: "success", meta: "Placeholder" },
    { id: "atividade-nova-lead", title: "Nova Lead", description: "Nova oportunidade adicionada ao pipeline.", badge: "Ha 18 min", variant: "warning", meta: "Placeholder" },
    { id: "atividade-novo-imovel", title: "Novo Imovel", description: "Imovel inserido para validacao documental.", badge: "Ha 29 min", variant: "neutral", meta: "Placeholder" },
    { id: "atividade-upload-documento", title: "Upload Documento", description: "Documento enviado para revisao interna.", badge: "Ha 41 min", variant: "danger", meta: "Placeholder" }
  ];

  return {
    kpis,
    acoesImediatas,
    agendaOperacional,
    pipeline,
    imoveisRisco,
    produtividade,
    ultimasAtividades
  };
}
