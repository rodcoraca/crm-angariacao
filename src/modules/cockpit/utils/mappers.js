import { formatarDataAcao, formatarHoraAgenda, labelEstadoAgenda } from "./formatters";

export function mapAgendaLead(lead, config) {
  const dataVisita = lead.data_visita || null;
  const dataBase = dataVisita || lead.created_at || null;

  return {
    id: `agenda-${config.tipo}-${lead.id}`,
    icone: config.icone,
    prioridade: config.prioridade,
    nome: lead.nome || "Lead sem nome",
    telefone: lead.telefone || "Sem telefone",
    hora: dataVisita ? formatarHoraAgenda(dataVisita) : "--:--",
    local: "-",
    estado: labelEstadoAgenda(lead.status),
    data: dataBase ? formatarDataAcao(dataBase) : "-"
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
