import {
  calculateAverageScore,
  formatPrice,
  formatPublishedDate,
  normalizeText
} from "../utils/radarUtils";

function normalizeTimestamp(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeLocation(item) {
  const morada = normalizeText(item?.morada, "");
  const cidade = normalizeText(item?.cidade, "");
  const label = [morada, cidade].filter(Boolean).join(", ").trim();
  return label || "Sem localização";
}

function normalizeEstateName(item) {
  return normalizeText(item?.titulo || item?.imovel, "Sem imóvel");
}

function normalizePrice(item) {
  if (item?.preco && String(item.preco).includes("€")) {
    return normalizeText(item.preco, "N/A");
  }

  return formatPrice(item?.preco);
}

function normalizePublished(item) {
  if (item?.publicado) {
    return normalizeText(item.publicado, "N/A");
  }

  return formatPublishedDate(item?.publicado_em);
}

function normalizeScore(item) {
  return normalizeText(item?.score, "0");
}

function normalizeStatus(item) {
  return normalizeText(item?.estado, "Novo");
}

function normalizeKpiValue(value, fallback) {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

export class RadarViewModel {
  static build(snapshot = {}) {
    const opportunities = snapshot.opportunities || [];

    return {
      opportunities,
      kpis: this.mapKpis(opportunities),
      table: this.mapTable(opportunities),
      flow: this.mapFlow(),
      roadmap: this.mapRoadmap(),
      timeline: this.mapTimeline(opportunities)
    };
  }

  static mapKpis(opportunities = []) {
    const monitorizadas = opportunities.length;
    const novas = opportunities.filter((item) => String(item?.estado || "").toLowerCase() === "novo").length;
    const importadas = opportunities.filter((item) => String(item?.estado || "").toLowerCase() === "importado").length;
    const scoreMedio = calculateAverageScore(opportunities);

    return [
      {
        id: "kpi-monitorizadas",
        titulo: "Monitorizadas",
        valor: String(monitorizadas),
        variacao: "Total atual",
        descricao: "Oportunidades monitorizadas pelo Radar.",
        icone: "M",
        cor: "#0f766e"
      },
      {
        id: "kpi-novas",
        titulo: "Novas",
        valor: String(novas),
        variacao: "Estado novo",
        descricao: "Oportunidades ainda por análise.",
        icone: "N",
        cor: "#1d4ed8"
      },
      {
        id: "kpi-importadas",
        titulo: "Importadas",
        valor: String(importadas),
        variacao: "Para Leads",
        descricao: "Oportunidades já importadas no fluxo.",
        icone: "I",
        cor: "#b45309"
      },
      {
        id: "kpi-pontuacao-media",
        titulo: "Pontuação Média",
        valor: String(scoreMedio),
        variacao: "Qualificação",
        descricao: "Média de score das oportunidades monitorizadas.",
        icone: "S",
        cor: "#166534"
      }
    ];
  }

  static mapTable(opportunities = []) {
    return opportunities.map((item) => ({
      id: normalizeText(item.id, "radar-row"),
      imovel: normalizeEstateName(item),
      localizacao: normalizeLocation(item),
      preco: normalizePrice(item),
      publicado: normalizePublished(item),
      score: normalizeScore(item),
      estado: normalizeStatus(item)
    }));
  }

  static mapFlow() {
    return [
      { id: "flow-monitorizacao", label: "Monitorização" },
      { id: "flow-normalizacao", label: "Normalização" },
      { id: "flow-classificacao", label: "Classificação" },
      { id: "flow-priorizacao", label: "Priorização" },
      { id: "flow-importacao", label: "Preparação para Importação" }
    ];
  }

  static mapRoadmap() {
    return [
      { id: "roadmap-demo", label: "Radar Demo" },
      { id: "roadmap-validacao", label: "Validação Operacional" },
      { id: "roadmap-integracao", label: "Integrações Futuras" },
      { id: "roadmap-escala", label: "Escala Multi-Fonte" }
    ];
  }

  static mapTimeline(opportunities = []) {
    const timeline = [];

    opportunities.forEach((item) => {
      const title = normalizeEstateName(item);

      timeline.push({
        id: `${item.id}-encontrada`,
        oportunidadeId: item.id,
        oportunidadeTitulo: title,
        evento: "Encontrada",
        estado: "encontrada",
        data: normalizeTimestamp(item?.encontrado_em || item?.publicado_em)
      });

      if (item?.analisado_em || String(item?.estado || "").toLowerCase() === "analisado") {
        timeline.push({
          id: `${item.id}-analisada`,
          oportunidadeId: item.id,
          oportunidadeTitulo: title,
          evento: "Analisada",
          estado: "analisada",
          data: normalizeTimestamp(item?.analisado_em || item?.publicado_em)
        });
      }

      if (item?.importado_em || String(item?.estado || "").toLowerCase() === "importado") {
        timeline.push({
          id: `${item.id}-importada`,
          oportunidadeId: item.id,
          oportunidadeTitulo: title,
          evento: "Importada",
          estado: "importada",
          data: normalizeTimestamp(item?.importado_em || item?.analisado_em || item?.publicado_em)
        });
      }

      if (item?.ignorado_em || String(item?.estado || "").toLowerCase() === "ignorado") {
        timeline.push({
          id: `${item.id}-ignorada`,
          oportunidadeId: item.id,
          oportunidadeTitulo: title,
          evento: "Ignorada",
          estado: "ignorada",
          data: normalizeTimestamp(item?.ignorado_em || item?.publicado_em)
        });
      }
    });

    return timeline
      .filter((item) => item.data)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }
}

export function createRadarViewModel(snapshot) {
  return RadarViewModel.build(snapshot);
}

export function mapRadarKpisViewModel(kpis) {
  return (kpis || []).map((item) => ({
    id: normalizeKpiValue(item.id, "kpi"),
    titulo: normalizeKpiValue(item.titulo, "Indicador"),
    valor: normalizeKpiValue(item.valor, "--"),
    variacao: normalizeKpiValue(item.variacao, "Sem variação"),
    descricao: normalizeKpiValue(item.descricao, "Sem descrição."),
    icone: normalizeKpiValue(item.icone, "*"),
    cor: item.cor || null
  }));
}

export function mapRadarTableViewModel(rows) {
  return (rows || []).map((item) => ({
    id: normalizeText(item.id, "radar-row"),
    imovel: normalizeEstateName(item),
    localizacao: normalizeLocation(item),
    preco: normalizePrice(item),
    publicado: normalizePublished(item),
    score: normalizeScore(item),
    estado: normalizeStatus(item)
  }));
}

export function mapRadarFlowViewModel(steps) {
  return (steps || []).map((item) => ({
    id: normalizeText(item.id, "flow"),
    label: normalizeText(item.label, "Etapa")
  }));
}

export function mapRadarRoadmapViewModel(stages) {
  return (stages || []).map((item) => ({
    id: normalizeText(item.id, "roadmap"),
    label: normalizeText(item.label, "Fase")
  }));
}

export function mapRadarTimelineViewModel(events) {
  return (events || []).map((item) => ({
    id: normalizeText(item.id, "timeline-event"),
    evento: normalizeText(item.evento, "Evento"),
    estado: normalizeText(item.estado, "estado"),
    oportunidadeTitulo: normalizeText(item.oportunidadeTitulo, "Sem oportunidade"),
    data: formatPublishedDate(item.data)
  }));
}
