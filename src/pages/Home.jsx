import { useMemo } from "react";
import { useTheme } from "../theme/ThemeContext";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import KpiCard from "../components/ui/KpiCard";
import {
  useCockpitActions,
  useCockpitActivity,
  useCockpitAgenda,
  useCockpitKPIs,
  useCockpitPipeline,
  useCockpitProductivity,
  useCockpitRisk
} from "../modules/cockpit/hooks";
import { createCockpitViewModel } from "../modules/cockpit/viewmodels";
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

export default function Home({ user }) {
  const theme = useTheme();

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
    error: agendaError
  } = useCockpitAgenda();
  const {
    data: imoveisSaudeItems,
    loading: imoveisSaudeLoading,
    error: imoveisSaudeError
  } = useCockpitRisk();
  const { data: produtividade } = useCockpitProductivity(produtividadeBase);
  const { data: ultimasAtividades } = useCockpitActivity(ultimasAtividadesBase);

  const pipelineTotal = pipelineComercial.reduce((acc, item) => acc + obterNumeroMetric(item.value), 0);
  const negociosGanhos = pipelineComercial.find((item) => item.id === "pipeline-fechado")?.value || "0";
  const negociosGanhosNumero = obterNumeroMetric(negociosGanhos);
  const taxaConversao = pipelineTotal > 0 ? Math.round((negociosGanhosNumero / pipelineTotal) * 100) : 0;
  const melhorEtapa = [...pipelineComercial]
    .sort((left, right) => obterNumeroMetric(right.value) - obterNumeroMetric(left.value))[0];
  const metasKpi = {
    leads: kpisTopo.find((item) => item.id === "kpi-leads-ativas")?.valor || "--",
    negocios: kpisTopo.find((item) => item.id === "kpi-negocios-fechados")?.valor || "--",
    visitas: String(agendaItems.length),
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

        <label className="cockpit-search" aria-label="Pesquisar no cockpit">
          <span className="cockpit-search__icon">P</span>
          <input type="search" placeholder="Pesquisar clientes, leads, imoveis ou tarefas" />
        </label>

        <div className="cockpit-topbar__right">
          <div className="cockpit-topbar__meta">
            <span className="cockpit-topbar__meta-label">Hoje</span>
            <strong className="cockpit-topbar__meta-value">{dataAtual}</strong>
          </div>

          <button type="button" className="cockpit-icon-button cockpit-icon-button--accent" aria-label="Notificacoes">
            3
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
              <p className="cockpit-panel__subtitle">Compromissos do dia com leitura imediata.</p>
            </div>
            <Badge variant="primary">{agendaItems.length || 0}</Badge>
          </div>

          {agendaLoading ? (
            <p className="cockpit-empty-state">A carregar agenda...</p>
          ) : agendaError ? (
            <p className="cockpit-empty-state">Erro ao carregar agenda.</p>
          ) : !agendaItems.length ? (
            <p className="cockpit-empty-state">Sem agenda registada para hoje.</p>
          ) : (
            <div className="cockpit-agenda-list">
              {agendaItems.map((item) => (
                <article key={item.id} className="cockpit-agenda-item">
                  <div className="cockpit-agenda-item__time">{item.hora}</div>
                  <div className="cockpit-token">{item.icone || "A"}</div>
                  <div className="cockpit-agenda-item__content">
                    <strong className="cockpit-agenda-item__title">{item.nome}</strong>
                    <p className="cockpit-agenda-item__client">{item.telefone}</p>
                    <small className="cockpit-agenda-item__meta">{item.estado} | {item.data}</small>
                  </div>
                  <Badge variant={obterVariantPrioridade(item.prioridade)}>{item.prioridade}</Badge>
                </article>
              ))}
            </div>
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
