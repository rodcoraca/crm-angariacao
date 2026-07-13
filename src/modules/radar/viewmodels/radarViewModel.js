import {
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
  const publishedAt = item?.created_at_first || item?.publicado_em || item?.published_at || item?.publicado || null;
  return formatPublishedDate(publishedAt);
}

function normalizeStatus(item) {
  return normalizeText(item?.estado, "Novo");
}

function normalizeKpiValue(value, fallback) {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function isSameDay(dateValue, referenceDate = new Date()) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth() &&
    date.getDate() === referenceDate.getDate()
  );
}

function resolveSyncExecutionsCount(snapshot = {}) {
  if (Number.isFinite(snapshot?.syncExecutions)) return snapshot.syncExecutions;
  if (Number.isFinite(snapshot?.syncCount)) return snapshot.syncCount;
  if (Array.isArray(snapshot?.syncExecutions)) return snapshot.syncExecutions.length;
  return null;
}

function formatTimeOnly(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

function toOperationalLabel(title, value) {
  if (value === null || value === undefined || value === "") {
    return `${title}: Aguardando dados`;
  }

  return `${title}: ${value}`;
}

function countDuplicateOpportunities(opportunities = []) {
  const keyCount = new Map();

  opportunities.forEach((item) => {
    const rawKey = item?.id_externo || item?.external_id || item?.url || item?.link || null;
    const key = String(rawKey || "").trim().toLowerCase();
    if (!key) return;
    keyCount.set(key, (keyCount.get(key) || 0) + 1);
  });

  let duplicates = 0;
  keyCount.forEach((count) => {
    if (count > 1) duplicates += (count - 1);
  });

  return duplicates;
}

export class RadarViewModel {
  static build(snapshot = {}) {
    const opportunities = snapshot.opportunities || [];

    return {
      opportunities,
      kpis: this.mapKpis(opportunities),
      table: this.mapTable(opportunities),
      flow: this.mapFlow(opportunities, snapshot),
      roadmap: this.mapRoadmap(opportunities, snapshot),
      timeline: this.mapTimeline(opportunities)
    };
  }

  static mapKpis(opportunities = []) {
    const monitorizadas = opportunities.length;
    const novas = opportunities.filter((item) => String(item?.estado || "").toLowerCase() === "novo").length;
    const importadas = opportunities.filter((item) => String(item?.estado || "").toLowerCase() === "importado").length;

    return [
      {
        id: "kpi-monitorizadas",
        titulo: "Monitorizadas",
        valor: String(monitorizadas),
        variacao: "Total atual",
        descricao: "Oportunidades monitorizadas pelo Radar.",
        icone: "M",
        cor: "var(--os-color-primary)"
      },
      {
        id: "kpi-novas",
        titulo: "Novas",
        valor: String(novas),
        variacao: "Estado novo",
        descricao: "Oportunidades ainda por análise.",
        icone: "N",
        cor: "var(--os-status-info-text)"
      },
      {
        id: "kpi-importadas",
        titulo: "Importadas",
        valor: String(importadas),
        variacao: "Para Leads",
        descricao: "Oportunidades já importadas no fluxo.",
        icone: "I",
        cor: "var(--os-status-warning-text)"
      }
    ];
  }

  static mapTable(opportunities = []) {
    return opportunities.map((item) => ({
      id: normalizeText(item.id, "radar-row"),
      imovel: item.titulo || item.title || "Sem imóvel",
      localizacao: normalizeLocation({
        morada: item.morada || item.location || "",
        cidade: item.cidade || ""
      }),
      preco: normalizePrice(item),
      publicado: normalizePublished({
        ...item,
        publicado_em: item.created_at_first || item.publicado_em || item.published_at || null
      }),
      estado: normalizeStatus(item),
      // Adicionamos os campos extra para consumo na UI
      tipo: item.tipo,
      quartos: item.quartos,
      link: item.link || item.url,
      rawOpportunity: item
    }));
  }

  static mapFlow(opportunities = [], snapshot = {}) {
    const registryRows = Array.isArray(snapshot?.providerRegistry) ? snapshot.providerRegistry : null;

    const latestSyncRaw = registryRows && registryRows.length
      ? registryRows
        .map((row) => row?.last_execution)
        .filter(Boolean)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null
      : null;

    const latestSync = formatTimeOnly(latestSyncRaw);
    const novas = opportunities.length
      ? opportunities.filter((item) => String(item?.estado || "").toLowerCase() === "novo").length
      : null;
    const duplicados = opportunities.length ? countDuplicateOpportunities(opportunities) : null;
    const erros = registryRows
      ? registryRows.filter((row) => String(row?.last_error || "").trim().length > 0).length
      : null;
    const sincronizacoesRealizadas = registryRows
      ? registryRows.filter((row) => Boolean(row?.last_execution)).length
      : null;

    return [
      { id: "flow-ultima-sync", label: toOperationalLabel("Última sincronização", latestSync) },
      { id: "flow-novas", label: toOperationalLabel("Novas oportunidades", novas) },
      { id: "flow-duplicados", label: toOperationalLabel("Duplicados", duplicados) },
      { id: "flow-erros", label: toOperationalLabel("Erros", erros) },
      { id: "flow-sincronizacoes", label: toOperationalLabel("Sincronizações realizadas", sincronizacoesRealizadas) }
    ];
  }

  static mapRoadmap(opportunities = [], snapshot = {}) {
    const importedToday = opportunities.filter((item) => {
      const importedState = String(item?.estado || "").toLowerCase() === "importado" || item?.imported === true;
      if (!importedState) return false;
      return isSameDay(item?.importado_em || item?.imported_at || item?.updated_at || null);
    }).length;

    const novas = opportunities.filter((item) => String(item?.estado || "").toLowerCase() === "novo").length;
    const ignoradas = opportunities.filter((item) => String(item?.estado || "").toLowerCase() === "ignorado").length;
    const convertidas = opportunities.filter((item) => item?.converted_to_lead === true || Boolean(item?.crm_lead_id)).length;
    const syncExecutions = resolveSyncExecutionsCount(snapshot);

    return [
      { id: "roadmap-importadas-hoje", label: `Oportunidades importadas hoje: ${importedToday}` },
      { id: "roadmap-novas", label: `Oportunidades novas: ${novas}` },
      { id: "roadmap-ignoradas", label: `Oportunidades ignoradas: ${ignoradas}` },
      { id: "roadmap-convertidas", label: `Oportunidades convertidas: ${convertidas}` },
      {
        id: "roadmap-sync",
        label: Number.isFinite(syncExecutions)
          ? `Sincronizações realizadas: ${syncExecutions}`
          : "Sincronizações realizadas: Aguardando dados"
      }
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
    rawOpportunity: item,
    imovel: item.titulo || item.title || "Sem imóvel",
    localizacao: normalizeLocation({
      morada: item.morada || item.location || "",
      cidade: item.cidade || ""
    }),
    preco: normalizePrice(item),
    publicado: normalizePublished({
      ...item,
      publicado_em: item.created_at_first || item.publicado_em || item.published_at || null
    }),
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

