import { formatarDataAcao, labelEstadoAgenda } from "./formatters";

function normalizarHora(value) {
  return value ? String(value).slice(0, 5) : "";
}

export function mapAgendaLead(lead, config) {
  const dataVisita = lead.data_visita || null;
  const dataBase = dataVisita || null;

  return {
    id: `agenda-${config.tipo}-${lead.id}`,
    icone: config.icone,
    prioridade: config.prioridade,
    nome: lead.nome || "Lead sem nome",
    telefone: lead.telefone || "Sem telefone",
    hora: normalizarHora(lead.hora_visita),
    local: lead.local_visita || "Local não indicado",
    estado: lead.status_visita || labelEstadoAgenda(lead.status),
    data: dataBase ? formatarDataAcao(dataBase) : "",
    informacaoCurta: lead.local_visita || lead.status_visita || "",
    tooltip: [lead.telefone, lead.local_visita, lead.status_visita].filter(Boolean).join(" · "),
    dataLembrete: null,
    horaLembrete: null
  };
}

export function mapLembreteLead(lead) {
  return {
    id: `agenda-lembrete-${lead.id}`,
    tipoAgenda: "lembrete",
    icone: "🔔",
    prioridade: "Media",
    nome: lead.nome || "Lead sem nome",
    telefone: lead.telefone || "Sem telefone",
    hora: normalizarHora(lead.hora_lembrete),
    estado: "Lembrete",
    data: lead.data_lembrete ? formatarDataAcao(lead.data_lembrete) : "",
    informacaoCurta: lead.telefone || "",
    tooltip: [lead.telefone, lead.data_lembrete, normalizarHora(lead.hora_lembrete)].filter(Boolean).join(" · "),
    dataLembrete: lead.data_lembrete || "",
    horaLembrete: normalizarHora(lead.hora_lembrete),
    leadId: lead.id
  };
}

export function calcularIndiceSaudeImovel(imovel, totalFicheiros) {
  const camposEssenciais = [
    imovel.proprietario,
    imovel.telefone,
    imovel.tipologia,
    imovel.zona,
    imovel.valor_pretendido,
    imovel.morada,
    imovel.concelho,
    imovel.distrito
  ];

  const totalEssenciais = camposEssenciais.length;
  const essenciaisPreenchidos = camposEssenciais.filter((value) => value !== null && value !== undefined && String(value).trim() !== "").length;

  const documentos = [
    { key: "cmi", label: "CMI", ok: Boolean(imovel.cmi) },
    { key: "caderneta_predial", label: "Caderneta Predial", ok: Boolean(imovel.caderneta_predial) },
    { key: "plantas", label: "Plantas", ok: Boolean(imovel.plantas) },
    { key: "certificado_energetico", label: "Certificado Energético", ok: Boolean(imovel.certificado_energetico) },
    { key: "cartao_cidadao", label: "Cartão de Cidadão", ok: Boolean(imovel.cartao_cidadao) }
  ];

  const documentosOk = documentos.filter((doc) => doc.ok).length;
  const documentosEmFalta = documentos.filter((doc) => !doc.ok).map((doc) => doc.label);

  const scoreEssenciais = totalEssenciais ? essenciaisPreenchidos / totalEssenciais : 0;
  const scoreDocumentos = documentos.length ? documentosOk / documentos.length : 0;
  const scoreFicheiros = totalFicheiros > 0 ? 1 : 0;

  const percentualCompletude = Math.round(((scoreEssenciais + scoreDocumentos + scoreFicheiros) / 3) * 100);

  return {
    id: `imovel-saude-${imovel.id}`,
    nome: imovel.proprietario || `Imovel ${imovel.id}`,
    percentualCompletude,
    documentosEmFaltaTexto: documentosEmFalta.length ? documentosEmFalta.join(", ") : "Nenhum",
    totalFicheiros,
    documentosOk,
    essenciaisPreenchidos,
    totalEssenciais
  };
}
