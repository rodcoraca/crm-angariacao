import { useTheme } from "../theme/ThemeContext";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";

export default function Home() {
  const theme = useTheme();

  const agora = new Date();
  const hora = agora.getHours();

  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const dataAtual = agora.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  const styles = {
    page: {
      display: "grid",
      gap: theme.spacing.lg
    },
    hero: {
      display: "grid",
      gap: theme.spacing.sm,
      padding: theme.spacing.lg
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
      fontSize: "2rem",
      lineHeight: 1.1
    },
    subtitle: {
      margin: 0,
      color: theme.colors.muted,
      fontSize: "1rem"
    },
    sectionTitle: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "1.2rem"
    },
    cockpitGrid: {
      display: "grid",
      gap: theme.spacing.md,
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"
    },
    blockCard: {
      padding: theme.spacing.md,
      minHeight: "170px",
      display: "grid",
      alignContent: "start",
      gap: theme.spacing.sm
    },
    blockTitle: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "1rem"
    },
    blockText: {
      margin: 0,
      color: theme.colors.muted,
      fontSize: "0.92rem"
    }
  };

  return (
    <div style={styles.page}>
      <Card style={styles.hero}>
        <div style={styles.topRow}>
          <p style={styles.saudacao}>{saudacao}</p>
          <Badge variant="primary">{dataAtual}</Badge>
        </div>

        <h1 style={styles.title}>Bem-vindo ao OSFlow</h1>
        <p style={styles.subtitle}>Sistema Operacional Comercial</p>
      </Card>

      <div style={{ display: "grid", gap: theme.spacing.md }}>
        <h2 style={styles.sectionTitle}>Cockpit Executivo</h2>

        <div style={styles.cockpitGrid}>
          <Card style={styles.blockCard}>
            <h3 style={styles.blockTitle}>KPIs</h3>
            <p style={styles.blockText}>Area reservada para indicadores executivos.</p>
            <EmptyState title="Em preparacao" description="Os KPIs serao ligados na proxima iteracao." />
          </Card>

          <Card style={styles.blockCard}>
            <h3 style={styles.blockTitle}>Centro de Acoes</h3>
            <p style={styles.blockText}>Area reservada para priorizacao operacional.</p>
            <EmptyState title="Em preparacao" description="As acoes serao alimentadas posteriormente." />
          </Card>

          <Card style={styles.blockCard}>
            <h3 style={styles.blockTitle}>Pipeline</h3>
            <p style={styles.blockText}>Area reservada para visao do funil comercial.</p>
            <EmptyState title="Em preparacao" description="Dados do pipeline ainda nao conectados." />
          </Card>

          <Card style={styles.blockCard}>
            <h3 style={styles.blockTitle}>Agenda</h3>
            <p style={styles.blockText}>Area reservada para compromissos e visitas.</p>
            <EmptyState title="Em preparacao" description="A agenda sera integrada em etapa futura." />
          </Card>

          <Card style={styles.blockCard}>
            <h3 style={styles.blockTitle}>Atividades Recentes</h3>
            <p style={styles.blockText}>Area reservada para o feed operacional mais recente.</p>
            <EmptyState title="Em preparacao" description="O feed sera habilitado na proxima fase." />
          </Card>
        </div>
      </div>
    </div>
  );
}
