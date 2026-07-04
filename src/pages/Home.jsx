import { useTheme } from "../theme/ThemeContext";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/ui/KpiCard";
import CockpitSection from "../components/intelligence/CockpitSection";
import CockpitList from "../components/intelligence/CockpitList";
import CockpitMetricTiles from "../components/intelligence/CockpitMetricTiles";
import ActionCard from "../components/intelligence/ActionCard";
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
  formatarDescricaoAcao,
  formatarDescricaoAgenda,
  formatarResumoSaudeImovel,
  obterNomeUtilizador
} from "../modules/cockpit/utils/formatters";
import "./Home.css";

export default function Home() {
  const theme = useTheme();

  const agora = new Date();
  const hora = agora.getHours();
  const nomeUtilizador = obterNomeUtilizador();

  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const dataAtual = agora.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  const mensagemDinamica =
    hora < 12
      ? "Hoje e um excelente dia para gerar novos negocios."
      : hora < 18
        ? "A tarde esta perfeita para acelerar o funil comercial."
        : "Feche o dia com foco nas prioridades operacionais.";

  const {
    kpis,
    pipeline,
    produtividade: produtividadeBase,
    ultimasAtividades: ultimasAtividadesBase
  } = createCockpitViewModel(theme);

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

  // ARQ-COCKPIT: TOPO (saudacao/data/mensagem)
  // Origem dos dados: sessao autenticada + relogio local + mensagem configuravel por regra de negocio.
  // Tabela: usuarios (nome/apelido/username); opcionalmente configuracoes_cockpit para mensagens.
  // Campos necessarios: usuarios.nome, usuarios.apelido, usuarios.username, usuarios.email, configuracoes_cockpit.mensagem.
  // Dependencias: contexto de autenticacao (user), locale pt-PT, politica de fallback para nome do utilizador.

  const styles = {
    page: {
      display: "grid",
      gap: theme.spacing.lg,
      background: `linear-gradient(180deg, ${theme.colors.background} 0%, ${theme.colors.surfaceSoft} 100%)`,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.md
    },
    hero: {
      display: "grid",
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
      background: `linear-gradient(135deg, ${theme.colors.surface} 0%, ${theme.colors.light} 100%)`
    },
    topRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
      flexWrap: "wrap"
    },
    saudacao: {
      margin: 0,
      color: theme.colors.muted,
      fontSize: "0.95rem",
      textTransform: "capitalize"
    },
    title: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "2.05rem",
      lineHeight: 1.1
    },
    subtitle: {
      margin: 0,
      color: theme.colors.muted,
      fontSize: "1rem",
      maxWidth: "62ch"
    },
    sectionTitle: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "1.2rem",
      letterSpacing: "0.01em"
    },
    kpiGrid: {
      display: "grid",
      gap: theme.spacing.md,
      gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))"
    }
  };

  return (
    <div style={styles.page}>
      {/* ARQ-COCKPIT: TOPO - bind futuro com dados de sessao (usuarios) e configuracao de mensagens. */}
      <Card style={styles.hero}>
        <div style={styles.topRow}>
          <p style={styles.saudacao}>
            {saudacao}, {nomeUtilizador}
          </p>
          <Badge variant="primary">{dataAtual}</Badge>
        </div>

        <h1 style={styles.title}>Cockpit Executivo OSFlow</h1>
        <p style={styles.subtitle}>{mensagemDinamica}</p>
      </Card>

      {/* ARQ-COCKPIT: KPIs - integrar agregacoes de leads/logs/imoveis mantendo contrato visual do KpiCard. */}
      <div style={{ display: "grid", gap: theme.spacing.md }}>
        <h2 style={styles.sectionTitle}>KPIs Operacionais</h2>
        <div style={styles.kpiGrid}>
          {kpisTopo.map((kpi) => (
            <KpiCard
              key={kpi.id}
              titulo={kpi.titulo}
              valor={kpi.valor}
              variacao={kpi.variacao}
              icone={kpi.icone}
              cor={kpi.cor}
            />
          ))}
        </div>
      </div>

      {/* ARQ-COCKPIT: LINHA 1 - ACOES IMEDIATAS + AGENDA OPERACIONAL (prioridade + cronologia do dia). */}
      <section className="cockpit-row cockpit-row-strong">
        <CockpitSection
          title="Acoes imediatas"
          subtitle="Estrutura preparada para priorizacao operacional"
          badge="Placeholder"
          badgeVariant="warning"
        >
          {acoesImediatasLoading ? (
            <p style={{ margin: 0, color: theme.colors.muted }}>A carregar acoes imediatas...</p>
          ) : acoesImediatasError ? (
            <p style={{ margin: 0, color: theme.colors.muted }}>Erro ao carregar acoes imediatas.</p>
          ) : !acoesImediatasItems.length ? (
            <p style={{ margin: 0, color: theme.colors.muted }}>Sem resultados para acoes imediatas.</p>
          ) : (
            <div style={{ display: "grid", gap: theme.spacing.sm }}>
              {acoesImediatasItems.map((item) => (
                <ActionCard
                  key={item.id}
                  icone={item.icone}
                  titulo={item.titulo}
                  prioridade={item.prioridade}
                  descricao={formatarDescricaoAcao(item)}
                  onAbrir={() => {}}
                />
              ))}
            </div>
          )}
        </CockpitSection>

        <CockpitSection
          title="Agenda operacional"
          subtitle="Visitas, contactos e follow-up"
          badge="Dia em curso"
          badgeVariant="primary"
        >
          {agendaLoading ? (
            <p style={{ margin: 0, color: theme.colors.muted }}>A carregar agenda...</p>
          ) : agendaError ? (
            <p style={{ margin: 0, color: theme.colors.muted }}>Erro ao carregar agenda.</p>
          ) : !agendaItems.length ? (
            <p style={{ margin: 0, color: theme.colors.muted }}>Sem agenda.</p>
          ) : (
            <div style={{ display: "grid", gap: theme.spacing.sm }}>
              {agendaItems.map((item) => (
                <ActionCard
                  key={item.id}
                  icone={item.icone}
                  titulo={item.nome}
                  prioridade={item.prioridade}
                  descricao={formatarDescricaoAgenda(item)}
                  onAbrir={() => {}}
                />
              ))}
            </div>
          )}
        </CockpitSection>
      </section>

      {/* ARQ-COCKPIT: LINHA 2 - PIPELINE + IMOVEIS EM RISCO (status comercial + completude documental). */}
      <section className="cockpit-row cockpit-row-strong">
        <CockpitSection title="Pipeline" subtitle="Resumo por etapa" badge="4 etapas" badgeVariant="primary">
          <CockpitMetricTiles items={pipelineComercial} />
        </CockpitSection>

        <CockpitSection
          title="Imoveis em risco"
          subtitle="Monitorizacao de qualidade de dados"
          badge="Atencao"
          badgeVariant="danger"
        >
          {imoveisSaudeLoading ? (
            <p style={{ margin: 0, color: theme.colors.muted }}>A carregar indice de saude...</p>
          ) : imoveisSaudeError ? (
            <p style={{ margin: 0, color: theme.colors.muted }}>Erro ao carregar indice de saude.</p>
          ) : !imoveisSaudeItems.length ? (
            <p style={{ margin: 0, color: theme.colors.muted }}>Sem imoveis pendentes.</p>
          ) : (
            <div style={{ display: "grid", gap: theme.spacing.sm }}>
              {imoveisSaudeItems.map((item) => (
                <Card
                  key={item.id}
                  style={{
                    padding: theme.spacing.md,
                    display: "grid",
                    gap: theme.spacing.sm,
                    boxShadow: "none",
                    borderStyle: "dashed"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: theme.spacing.sm, flexWrap: "wrap" }}>
                    <strong style={{ color: theme.colors.text }}>{item.nome}</strong>
                    <Badge variant={item.percentualCompletude < 50 ? "danger" : item.percentualCompletude < 80 ? "warning" : "success"}>
                      {item.percentualCompletude}%
                    </Badge>
                  </div>

                  <div
                    aria-label={`Completude ${item.percentualCompletude}%`}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={item.percentualCompletude}
                    style={{
                      width: "100%",
                      height: "8px",
                      borderRadius: theme.borderRadius.sm,
                      background: theme.colors.surfaceSoft,
                      overflow: "hidden"
                    }}
                  >
                    <div
                      style={{
                        width: `${item.percentualCompletude}%`,
                        height: "100%",
                        background: item.percentualCompletude < 50
                          ? theme.colors.danger
                          : item.percentualCompletude < 80
                            ? theme.colors.warning
                            : theme.colors.success
                      }}
                    />
                  </div>

                  <p style={{ margin: 0, color: theme.colors.muted, fontSize: "0.9rem", lineHeight: 1.45 }}>
                    {formatarResumoSaudeImovel(item)}
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: theme.spacing.sm, flexWrap: "wrap" }}>
                    <small style={{ color: theme.colors.muted }}>Documentos em falta: {item.documentosEmFaltaTexto}</small>
                    <Button variant="ghost" size="sm" onClick={() => {}}>Abrir</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CockpitSection>
      </section>

      {/* ARQ-COCKPIT: LINHA 3 - PRODUTIVIDADE + ULTIMAS ATIVIDADES (performance + feed operacional). */}
      <section className="cockpit-row cockpit-row-strong">
        <CockpitSection title="Produtividade" subtitle="Indicadores de execucao" badge="Hoje" badgeVariant="success">
          <CockpitMetricTiles items={produtividade} />
        </CockpitSection>

        <CockpitSection
          title="Ultimas atividades"
          subtitle="Linha cronologica operacional"
          badge="Feed"
          badgeVariant="neutral"
        >
          <CockpitList items={ultimasAtividades} />
        </CockpitSection>
      </section>
    </div>
  );
}
