import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { usePermissions } from "../modules/auth/hooks";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import Card from "../components/ui/Card";
import KpiCard from "../components/ui/KpiCard";
import Tooltip from "../components/ui/Tooltip";
import { notify } from "../components/ui/feedbackBus";
import {
  useCockpitActions,
  useCockpitActivity,
  useCockpitAgenda,
  useCockpitKPIs,
  useCockpitPipeline,
  useCockpitProductivity,
  useCockpitRisk
} from "../modules/cockpit/hooks";
import { searchCockpitGlobal } from "../modules/cockpit/services";
import { createCockpitViewModel } from "../modules/cockpit/viewmodels";
import { concluirLembreteLead } from "../modules/leads/services";
import {
  formatarResumoSaudeImovel
} from "../modules/cockpit/utils/formatters";
import "./Home.css";

function obterNumeroMetric(value) {
  if (value === null || value === undefined) return 0;

  const sanitized = String(value).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function obterPercentagem(value) {
  const match = String(value || "").match(/-?\d+(?:[.,]\d+)?(?=%)/);
  if (!match) return null;

  const parsed = Number.parseFloat(match[0].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function obterIniciais(label) {
  const normalized = String(label || "Utilizador").trim();
  if (!normalized) return "U";

  return normalized
    .split(/\s+/)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() || "")
    .join("") || "U";
}

function obterVariantPrioridade(prioridade) {
  const key = String(prioridade || "").toLowerCase();
  if (key === "alta") return "danger";
  if (key === "media") return "warning";
  if (key === "baixa") return "success";
  return "neutral";
}

function criarSparkline(value, index) {
  const base = Math.max(obterNumeroMetric(value), 1);

  return Array.from({ length: 5 }, (_, itemIndex) => {
    const factor = ((base + (index + 1) * 7 + itemIndex * 5) % 9) + 3;
    return Math.max(24, Math.min(88, factor * 9));
  });
}

function obterDataLocal() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
}

const lembretesDisparadosSessao = new Set();

function lembreteDevido(item, agora = new Date()) {
  if (item.tipoAgenda !== "lembrete" || !item.dataLembrete || !item.horaLembrete) return false;
  const [ano, mes, dia] = item.dataLembrete.split("-").map(Number);
  const [hora, minuto] = item.horaLembrete.split(":").map(Number);
  const dataHora = new Date(ano, mes - 1, dia, hora, minuto || 0, 0, 0);
  return item.dataLembrete === obterDataLocal() && dataHora <= agora;
}

function reproduzirSomLembrete() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const tocar = () => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 760;
      gain.gain.setValueAtTime(0.42, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.28);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.28);
      oscillator.addEventListener("ended", () => context.close().catch(() => {}), { once: true });
    };

    if (context.state === "suspended") {
      context.resume().then(tocar).catch(() => context.close().catch(() => {}));
      return;
    }

    tocar();
  } catch {
    // O áudio pode ser bloqueado pelo browser sem interação prévia.
  }
}

function AgendaItems({ items, onOpenLead, onCompleteReminder, completingReminderIds = new Set(), emptyTitle }) {
  if (!items.length) return <EmptyState title={emptyTitle} />;

  return (
    <div className="cockpit-agenda-list">
      {items.map((item) => {
        const content = (
          <>
            <div className="cockpit-agenda-item__time">{item.hora}</div>
            <div className="cockpit-agenda-item__type">{item.tipoAgenda === "lembrete" ? "🔔 Lembrete" : "📅 Compromisso"}</div>
            <strong className="cockpit-agenda-item__title">{item.nome}</strong>
            <span className="cockpit-agenda-item__client">{item.informacaoCurta}</span>
          </>
        );

        if (item.tipoAgenda !== "lembrete") {
          return (
            <Tooltip key={item.id} content={item.tooltip} placement="top">
              <button
                type="button"
                className="cockpit-agenda-item"
                onClick={() => onOpenLead?.(item.leadId)}
                disabled={!onOpenLead}
              >
                {content}
              </button>
            </Tooltip>
          );
        }

        const isCompleting = completingReminderIds.has(item.leadId);

        return (
          <Tooltip key={item.id} content={item.tooltip} placement="top">
            <div className="cockpit-agenda-item cockpit-agenda-item--lembrete">
              {content}
              <div className="cockpit-agenda-item__actions">
                <button
                  type="button"
                  className="cockpit-agenda-action"
                  onClick={() => onCompleteReminder?.(item)}
                  disabled={isCompleting}
                >
                  {isCompleting ? "A concluir" : "Concluir"}
                </button>
                <button
                  type="button"
                  className="cockpit-agenda-action"
                  onClick={() => onOpenLead?.(item.leadId)}
                  disabled={!onOpenLead}
                >
                  Alterar
                </button>
              </div>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}

export default function Home({ user, onOpenSearchResult = null, onOpenLead = null }) {
  const theme = useTheme();
  const { can } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [lembretesConcluidosIds, setLembretesConcluidosIds] = useState(() => new Set());
  const [lembretesAConcluirIds, setLembretesAConcluirIds] = useState(() => new Set());
  const searchRef = useRef(null);
  const searchRequestRef = useRef(0);

  const agora = new Date();
  const hora = agora.getHours();

  function obterNomeApelidoUtilizadorAutenticado() {
    const nome = (user?.user_metadata?.nome || "").trim();
    const apelido = (user?.user_metadata?.apelido || "").trim();

    if (nome || apelido) return `${nome} ${apelido}`.trim();

    const fullName = (user?.user_metadata?.full_name || user?.user_metadata?.name || "").trim();
    return fullName;
  }

  function obterSaudacaoPorPeriodo(h) {
    if (h >= 0 && h <= 11) return "Bom dia";
    if (h >= 12 && h <= 18) return "Boa tarde";
    return "Boa noite";
  }

  const nomeUtilizador = obterNomeApelidoUtilizadorAutenticado();
  const dataAtual = agora.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  const saudacao = nomeUtilizador
    ? `${obterSaudacaoPorPeriodo(hora)}, ${nomeUtilizador}`
    : "Bem-vindo.";
  const empresaSelecionada = (
    user?.user_metadata?.empresa_nome
    || user?.user_metadata?.empresa
    || user?.user_metadata?.company_name
    || user?.user_metadata?.empresa_id
    || "OSFlow"
  ).toString();
  const avatarIniciais = obterIniciais(nomeUtilizador || user?.email || "OSFlow");
  const canViewUsers = can("users.view");

  const {
    kpis,
    pipeline,
    produtividade: produtividadeBase,
    ultimasAtividades: ultimasAtividadesBase
  } = useMemo(() => createCockpitViewModel(theme), [theme]);

  const { data: kpisTopo } = useCockpitKPIs(kpis);
  const { data: pipelineComercial } = useCockpitPipeline(pipeline);
  const {
    data: acoesImediatasItems,
    loading: acoesImediatasLoading,
    error: acoesImediatasError
  } = useCockpitActions();
  const {
    data: agendaItems,
    loading: agendaLoading,
    error: agendaError,
    refresh: refreshAgenda
  } = useCockpitAgenda();
  const permissaoNotificacaoRef = useRef(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      refreshAgenda();
    }, 60000);
    return () => window.clearInterval(intervalId);
  }, [refreshAgenda]);

  useEffect(() => {
    agendaItems.filter((item) => lembreteDevido(item)).forEach((item) => {
      const key = `${item.leadId}:${item.dataLembrete}:${item.horaLembrete}`;
      if (lembretesDisparadosSessao.has(key)) return;
      lembretesDisparadosSessao.add(key);

      notify({
        message: `🔔 Lembrete: ${item.nome}${item.informacaoCurta ? ` · ${item.informacaoCurta}` : ""}`,
        variant: "warning",
        duration: 7000,
        actionLabel: "Abrir Lead",
        onAction: () => onOpenLead?.(item.leadId)
      });
      reproduzirSomLembrete();

      try {
        if ("Notification" in window) {
          const mostrar = () => {
            if (window.Notification.permission === "granted") {
              new window.Notification("OSFlow — Lembrete", { body: `${item.nome}${item.informacaoCurta ? ` · ${item.informacaoCurta}` : ""}` });
            }
          };
          if (window.Notification.permission === "default" && !permissaoNotificacaoRef.current) {
            permissaoNotificacaoRef.current = true;
            window.Notification.requestPermission().then(mostrar).catch(() => {});
          } else {
            mostrar();
          }
        }
      } catch {
        // A notificação do browser é opcional; o Toast interno já foi emitido.
      }
    });
  }, [agendaItems, onOpenLead]);
  const {
    data: imoveisSaudeItems,
    loading: imoveisSaudeLoading,
    error: imoveisSaudeError
  } = useCockpitRisk();
  const { data: produtividade } = useCockpitProductivity(produtividadeBase);
  const { data: ultimasAtividades } = useCockpitActivity(ultimasAtividadesBase);
  const agendaItemsVisiveis = useMemo(
    () => agendaItems.filter((item) => item.tipoAgenda !== "lembrete" || !lembretesConcluidosIds.has(item.leadId)),
    [agendaItems, lembretesConcluidosIds]
  );

  async function concluirLembreteAgenda(item) {
    if (!item?.leadId || lembretesAConcluirIds.has(item.leadId)) return;

    setLembretesAConcluirIds((prev) => new Set(prev).add(item.leadId));
    const result = await concluirLembreteLead({ leadId: item.leadId, user });

    if (result?.error) {
      notify({
        message: result.error.message || "Não foi possível concluir o lembrete.",
        variant: "danger",
        duration: 5000
      });
      setLembretesAConcluirIds((prev) => {
        const next = new Set(prev);
        next.delete(item.leadId);
        return next;
      });
      return;
    }

    setLembretesConcluidosIds((prev) => new Set(prev).add(item.leadId));
    setLembretesAConcluirIds((prev) => {
      const next = new Set(prev);
      next.delete(item.leadId);
      return next;
    });
    refreshAgenda();
  }

  const pipelineTotal = pipelineComercial.reduce((acc, item) => acc + obterNumeroMetric(item.value), 0);
  const negociosGanhos = pipelineComercial.find((item) => item.id === "pipeline-fechado")?.value || "0";
  const negociosGanhosNumero = obterNumeroMetric(negociosGanhos);
  const taxaConversao = pipelineTotal > 0 ? Math.round((negociosGanhosNumero / pipelineTotal) * 100) : 0;
  const melhorEtapa = [...pipelineComercial]
    .sort((left, right) => obterNumeroMetric(right.value) - obterNumeroMetric(left.value))[0];
  const metasKpi = {
    leads: kpisTopo.find((item) => item.id === "kpi-leads-ativas")?.valor || "--",
    negocios: kpisTopo.find((item) => item.id === "kpi-negocios-fechados")?.valor || "--",
    visitas: String(agendaItemsVisiveis.length),
    conversao: produtividade.find((item) => item.id === "prod-conversao")?.value || `${taxaConversao}%`
  };
  const volumesMeta = [
    obterNumeroMetric(metasKpi.leads),
    obterNumeroMetric(metasKpi.negocios),
    agendaItems.length,
    obterPercentagem(metasKpi.conversao) || taxaConversao
  ];
  const maiorVolumeMeta = Math.max(...volumesMeta, 1);

  const radarItems = produtividade.slice(0, 4).map((item, index) => {
    const percentagem = obterPercentagem(item.value);
    const numero = obterNumeroMetric(item.value);
    const basePercentual = percentagem !== null ? percentagem : Math.round((numero / Math.max(...produtividade.map((metric) => obterNumeroMetric(metric.value)), 1)) * 100);

    return {
      ...item,
      variation: item.hint || (percentagem !== null ? `${percentagem}%` : `${numero}`),
      progress: Math.max(12, Math.min(100, basePercentual || 12)),
      sparkline: criarSparkline(item.value, index)
    };
  });

  const alertas = [
    ...acoesImediatasItems.slice(0, 3).map((item) => ({
      id: item.id,
      titulo: item.categoria,
      detalhe: item.titulo,
      badge: item.prioridade,
      variant: obterVariantPrioridade(item.prioridade)
    }))
  ];

  if (imoveisSaudeItems[0]) {
    alertas.push({
      id: imoveisSaudeItems[0].id,
      titulo: "Documentacao pendente",
      detalhe: `${imoveisSaudeItems[0].nome} com ${imoveisSaudeItems[0].percentualCompletude}% de completude`,
      badge: "Critico",
      variant: imoveisSaudeItems[0].percentualCompletude < 50 ? "danger" : "warning"
    });
  }

  const objetivos = [
    {
      id: "objetivo-leads",
      label: "Leads",
      value: metasKpi.leads,
      progress: Math.round((obterNumeroMetric(metasKpi.leads) / maiorVolumeMeta) * 100),
      note: "Volume atual"
    },
    {
      id: "objetivo-negocios",
      label: "Negocios",
      value: metasKpi.negocios,
      progress: Math.round((obterNumeroMetric(metasKpi.negocios) / maiorVolumeMeta) * 100),
      note: "Ganhos registados"
    },
    {
      id: "objetivo-visitas",
      label: "Visitas",
      value: metasKpi.visitas,
      progress: Math.round((agendaItems.length / maiorVolumeMeta) * 100),
      note: "Agenda do dia"
    },
    {
      id: "objetivo-conversao",
      label: "Conversao",
      value: metasKpi.conversao,
      progress: obterPercentagem(metasKpi.conversao) || taxaConversao,
      note: "Taxa observada"
    }
  ].map((item) => ({
    ...item,
    progress: Math.max(8, Math.min(100, item.progress || 0))
  }));

  const pipelineResumo = [
    {
      id: "resumo-pipeline-total",
      label: "Funil",
      value: `${pipelineTotal}`,
      hint: "oportunidades em aberto"
    },
    {
      id: "resumo-pipeline-conversao",
      label: "Taxa de conversao",
      value: `${taxaConversao}%`,
      hint: "ganhos sobre total visivel"
    },
    {
      id: "resumo-pipeline-valor",
      label: "Valor do pipeline",
      value: "N/D",
      hint: "sem valor monetario exposto"
    },
    {
      id: "resumo-pipeline-ticket",
      label: "Ticket medio",
      value: "N/D",
      hint: "indisponivel neste contrato"
    },
    {
      id: "resumo-pipeline-ganhos",
      label: "Negocios ganhos",
      value: `${negociosGanhosNumero}`,
      hint: melhorEtapa ? `maior volume em ${melhorEtapa.label}` : "sem dados"
    }
  ];

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    const normalized = String(debouncedSearchTerm || "").trim();
    if (normalized.length < 2) {
      setSearchResults([]);
      setSearchError("");
      setIsSearchLoading(false);
      setHighlightedIndex(0);
      return;
    }

    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    setIsSearchLoading(true);
    setSearchError("");
    setIsSearchOpen(true);

    let cancelled = false;

    async function runSearch() {
      const { data, error } = await searchCockpitGlobal({
        term: normalized,
        currentUser: user,
        canViewUsers,
        companyName: empresaSelecionada
      });

      if (cancelled || requestId !== searchRequestRef.current) {
        return;
      }

      if (error) {
        console.error("[Home.searchCockpitGlobal]", error);
        setSearchResults([]);
        setSearchError("Não foi possível pesquisar agora.");
        setIsSearchLoading(false);
        setHighlightedIndex(0);
        return;
      }

      setSearchResults(data || []);
      setSearchError("");
      setIsSearchLoading(false);
      setHighlightedIndex(0);
    }

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [canViewUsers, debouncedSearchTerm, empresaSelecionada, user]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!searchRef.current?.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function closeSearch() {
    setIsSearchOpen(false);
    setHighlightedIndex(0);
  }

  function openSearchResult(result) {
    if (!result) return;

    onOpenSearchResult?.(result);
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSearchResults([]);
    setSearchError("");
    closeSearch();
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    const selected = searchResults[highlightedIndex] || searchResults[0] || null;
    if (selected) {
      openSearchResult(selected);
    }
  }

  function handleSearchKeyDown(event) {
    if (!isSearchOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setIsSearchOpen(true);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
      return;
    }

    if (!searchResults.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((value) => (value + 1) % searchResults.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((value) => (value - 1 + searchResults.length) % searchResults.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      openSearchResult(searchResults[highlightedIndex] || searchResults[0]);
    }
  }

  return (
    <div
      className="cockpit-premium"
      style={{
        "--cockpit-background": theme.colors.background,
        "--cockpit-surface": theme.colors.surface,
        "--cockpit-surface-soft": theme.colors.surfaceSoft,
        "--cockpit-border": theme.colors.border,
        "--cockpit-text": theme.colors.text,
        "--cockpit-muted": theme.colors.muted,
        "--cockpit-primary": theme.colors.primary,
        "--cockpit-success": theme.colors.success,
        "--cockpit-warning": theme.colors.warning,
        "--cockpit-danger": theme.colors.danger,
        "--cockpit-shadow": theme.shadow.sm,
        "--cockpit-radius": "12px"
      }}
    >
      <header className="cockpit-topbar">
        <div className="cockpit-topbar__left">
          <button type="button" className="cockpit-icon-button" aria-label="Abrir menu">|||</button>

          <div className="cockpit-topbar__title-block">
            <span className="cockpit-eyebrow">Cockpit</span>
            <h1 className="cockpit-page-title">Cockpit</h1>
          </div>

          <div className="cockpit-company-chip">
            <span className="cockpit-company-chip__label">Empresa</span>
            <strong className="cockpit-company-chip__value">{empresaSelecionada}</strong>
          </div>
        </div>

        <form className="cockpit-search-shell" onSubmit={handleSearchSubmit} ref={searchRef}>
          <label className="cockpit-search" aria-label="Pesquisar no cockpit">
            <span className="cockpit-search__icon">P</span>
            <input
              type="search"
              placeholder="Pesquisar leads, imóveis, negócios ou utilizadores"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setIsSearchOpen(Boolean(event.target.value.trim()));
              }}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                if (searchTerm.trim()) {
                  setIsSearchOpen(true);
                }
              }}
              aria-controls="cockpit-global-search-results"
              aria-autocomplete="list"
            />
          </label>

          {isSearchOpen ? (
            <div className="cockpit-search-results" id="cockpit-global-search-results" role="listbox">
              {isSearchLoading ? <div className="cockpit-search-results__state">A pesquisar...</div> : null}
              {!isSearchLoading && searchError ? <div className="cockpit-search-results__state">{searchError}</div> : null}
              {!isSearchLoading && !searchError && !searchResults.length ? (
                <div className="cockpit-search-results__state">Sem resultados para a pesquisa atual.</div>
              ) : null}
              {!isSearchLoading && !searchError && searchResults.length ? (
                <div className="cockpit-search-results__list">
                  {searchResults.map((result, index) => (
                    <button
                      key={result.id}
                      type="button"
                      className={`cockpit-search-result${index === highlightedIndex ? " cockpit-search-result--active" : ""}`}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => openSearchResult(result)}
                      role="option"
                      aria-selected={index === highlightedIndex}
                    >
                      <span className="cockpit-search-result__icon" aria-hidden="true">{result.icon}</span>
                      <span className="cockpit-search-result__content">
                        <span className="cockpit-search-result__type">{result.type}</span>
                        <strong className="cockpit-search-result__title">{result.title}</strong>
                        <span className="cockpit-search-result__company">{result.company}</span>
                        <span className="cockpit-search-result__secondary">{result.secondary}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </form>

        <div className="cockpit-topbar__right">
          <div className="cockpit-topbar__meta">
            <span className="cockpit-topbar__meta-label">Hoje</span>
            <strong className="cockpit-topbar__meta-value">{dataAtual}</strong>
          </div>

          <button type="button" className="cockpit-icon-button cockpit-icon-button--accent" aria-label="Lembretes de hoje">
            🔔 {agendaItemsVisiveis.filter((item) => item.tipoAgenda === "lembrete").length}
          </button>

          <div className="cockpit-avatar" title={nomeUtilizador || user?.email || "Utilizador autenticado"}>
            <span>{avatarIniciais}</span>
          </div>
        </div>
      </header>

      <section className="cockpit-kpi-grid" aria-label="Indicadores principais">
        {kpisTopo.map((kpi) => (
          <KpiCard
            key={kpi.id}
            titulo={kpi.titulo}
            valor={kpi.valor}
            variacao={kpi.variacao}
            icone={kpi.icone}
            cor={kpi.cor}
            className="cockpit-kpi-card"
            style={{
              minHeight: 0,
              padding: "16px",
              borderRadius: "12px"
            }}
          />
        ))}
      </section>

      <section className="cockpit-grid-12">
        <Card className="cockpit-panel cockpit-panel--pipeline" style={{ gridColumn: "span 8", padding: "16px", borderRadius: "12px", height: "100%" }}>
          <div className="cockpit-panel__header">
            <div>
              <h2 className="cockpit-panel__title">Pipeline comercial</h2>
              <p className="cockpit-panel__subtitle">Funil, conversao e leitura comercial numa unica vista.</p>
            </div>
            <Badge variant="primary">{pipelineComercial.length} etapas</Badge>
          </div>

          <div className="cockpit-stat-grid cockpit-stat-grid--five">
            {pipelineResumo.map((item) => (
              <div key={item.id} className="cockpit-stat-tile">
                <span className="cockpit-stat-tile__label">{item.label}</span>
                <strong className="cockpit-stat-tile__value">{item.value}</strong>
                <small className="cockpit-stat-tile__hint">{item.hint}</small>
              </div>
            ))}
          </div>

          <div className="cockpit-funnel-list">
            {pipelineComercial.map((item) => {
              const stageValue = obterNumeroMetric(item.value);
              const width = pipelineTotal > 0 ? Math.max(10, Math.round((stageValue / pipelineTotal) * 100)) : 10;

              return (
                <div key={item.id} className="cockpit-funnel-row">
                  <span className="cockpit-funnel-row__label">{item.label}</span>

                  <div className="cockpit-progress-track cockpit-progress-track--pipeline" aria-hidden="true">
                    <span className="cockpit-progress-bar" style={{ width: `${width}%` }} />
                  </div>

                  <strong className="cockpit-funnel-row__value">{item.value}</strong>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="cockpit-panel" style={{ gridColumn: "span 4", padding: "16px", borderRadius: "12px", height: "100%" }}>
          <div className="cockpit-panel__header">
            <div>
              <h2 className="cockpit-panel__title">Agenda de hoje</h2>
              <p className="cockpit-panel__subtitle">Compromissos e lembretes do dia com leitura imediata.</p>
            </div>
            <Badge variant="primary">{agendaItemsVisiveis.length || 0}</Badge>
          </div>

          {agendaLoading ? (
            <p className="cockpit-empty-state">A carregar agenda...</p>
          ) : agendaError ? (
            <p className="cockpit-empty-state">Erro ao carregar agenda.</p>
          ) : (
            <>
              <h3 className="cockpit-panel__title">Compromissos</h3>
              <AgendaItems items={agendaItemsVisiveis.filter((item) => item.tipoAgenda === "compromisso")} onOpenLead={onOpenLead} emptyTitle="Sem compromissos para hoje." />
              <h3 className="cockpit-panel__title">Lembretes</h3>
              {agendaItemsVisiveis.some((item) => item.tipoAgenda === "lembrete") ? (
                <AgendaItems
                  items={agendaItemsVisiveis.filter((item) => item.tipoAgenda === "lembrete")}
                  onOpenLead={onOpenLead}
                  onCompleteReminder={concluirLembreteAgenda}
                  completingReminderIds={lembretesAConcluirIds}
                  emptyTitle="Sem lembretes para hoje."
                />
              ) : (
                <EmptyState title="Sem lembretes para hoje." />
              )}
            </>
          )}
        </Card>

        <Card className="cockpit-panel" style={{ gridColumn: "span 8", padding: "16px", borderRadius: "12px", height: "100%" }}>
          <div className="cockpit-panel__header">
            <div>
              <h2 className="cockpit-panel__title">Radar comercial</h2>
              <p className="cockpit-panel__subtitle">Produtividade compacta com sinais de tendencia.</p>
            </div>
            <Badge variant="success">Hoje</Badge>
          </div>

          <div className="cockpit-radar-grid">
            {radarItems.map((item) => (
              <article key={item.id} className="cockpit-radar-card">
                <div className="cockpit-radar-card__header">
                  <span className="cockpit-radar-card__label">{item.label}</span>
                  <strong className="cockpit-radar-card__value">{item.value}</strong>
                </div>

                <div className="cockpit-sparkline" aria-hidden="true">
                  {item.sparkline.map((height, index) => (
                    <span key={`${item.id}-${index}`} style={{ height: `${height}%` }} />
                  ))}
                </div>

                <div className="cockpit-radar-card__footer">
                  <small>{item.variation}</small>
                  <span>{item.progress}%</span>
                </div>
              </article>
            ))}
          </div>
        </Card>

        <Card className="cockpit-panel" style={{ gridColumn: "span 4", padding: "16px", borderRadius: "12px", height: "100%" }}>
          <div className="cockpit-panel__header">
            <div>
              <h2 className="cockpit-panel__title">Ultimas atividades</h2>
              <p className="cockpit-panel__subtitle">Feed continuo da operacao.</p>
            </div>
            <Badge variant="neutral">Live</Badge>
          </div>

          <div className="cockpit-activity-list">
            {ultimasAtividades.map((item) => (
              <article key={item.id} className="cockpit-activity-item">
                <div className={`cockpit-activity-item__icon cockpit-activity-item__icon--${item.variant || "neutral"}`}>
                  {obterIniciais(item.title)}
                </div>

                <div className="cockpit-activity-item__content">
                  <div className="cockpit-activity-item__header">
                    <strong>{item.title}</strong>
                    <span>{item.badge}</span>
                  </div>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </Card>

        <Card className="cockpit-panel" style={{ gridColumn: "span 6", padding: "16px", borderRadius: "12px", height: "100%" }}>
          <div className="cockpit-panel__header">
            <div>
              <h2 className="cockpit-panel__title">Alertas</h2>
              <p className="cockpit-panel__subtitle">Pendencias criticas e itens que exigem acao.</p>
            </div>
            <Badge variant="warning">{alertas.length}</Badge>
          </div>

          {acoesImediatasLoading && !alertas.length ? (
            <p className="cockpit-empty-state">A carregar alertas...</p>
          ) : acoesImediatasError && !alertas.length ? (
            <p className="cockpit-empty-state">Erro ao carregar alertas.</p>
          ) : !alertas.length ? (
            <p className="cockpit-empty-state">Sem alertas prioritarios.</p>
          ) : (
            <div className="cockpit-alert-list">
              {alertas.slice(0, 4).map((item) => (
                <article key={item.id} className={`cockpit-alert-item cockpit-alert-item--${item.variant}`}>
                  <div className="cockpit-alert-item__content">
                    <strong>{item.titulo}</strong>
                    <p>{item.detalhe}</p>
                  </div>
                  <Badge variant={item.variant}>{item.badge}</Badge>
                </article>
              ))}
            </div>
          )}

          {!imoveisSaudeLoading && !imoveisSaudeError && Boolean(imoveisSaudeItems.length) ? (
            <div className="cockpit-risk-summary">
              {imoveisSaudeItems.slice(0, 2).map((item) => (
                <div key={item.id} className="cockpit-risk-summary__item">
                  <div className="cockpit-risk-summary__header">
                    <strong>{item.nome}</strong>
                    <span>{item.percentualCompletude}%</span>
                  </div>
                  <div className="cockpit-progress-track" aria-hidden="true">
                    <span
                      className="cockpit-progress-bar"
                      style={{
                        width: `${item.percentualCompletude}%`,
                        background: item.percentualCompletude < 50
                          ? theme.colors.danger
                          : item.percentualCompletude < 80
                            ? theme.colors.warning
                            : theme.colors.success
                      }}
                    />
                  </div>
                  <small>{formatarResumoSaudeImovel(item)}</small>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="cockpit-panel" style={{ gridColumn: "span 6", padding: "16px", borderRadius: "12px", height: "100%" }}>
          <div className="cockpit-panel__header">
            <div>
              <h2 className="cockpit-panel__title">Objetivos</h2>
              <p className="cockpit-panel__subtitle">Leitura relativa dos principais volumes visiveis.</p>
            </div>
            <Badge variant="primary">4 frentes</Badge>
          </div>

          <div className="cockpit-goals-list">
            {objetivos.map((item) => (
              <div key={item.id} className="cockpit-goal-item">
                <div className="cockpit-goal-item__header">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>

                <div
                  className="cockpit-progress-track"
                  role="progressbar"
                  aria-label={item.label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={item.progress}
                >
                  <span className="cockpit-progress-bar" style={{ width: `${item.progress}%` }} />
                </div>

                <small>{item.note}</small>
              </div>
            ))}
          </div>

          <p className="cockpit-footnote">Metas exibidas com base no volume atual visivel no Cockpit. Receita e ticket medio continuam indisponiveis neste contrato de dados.</p>
        </Card>
      </section>

      <div className="cockpit-signature-row">
        <span className="cockpit-signature-row__status">{saudacao}</span>
        <span className="cockpit-signature-row__status">Centro de comando OSFlow</span>
      </div>
    </div>
  );
}
