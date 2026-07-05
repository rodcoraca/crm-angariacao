import { useTheme } from "../theme/ThemeContext";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";

const cards = [
  "Novos imóveis particulares",
  "Novos anúncios",
  "Oportunidades prioritárias",
  "Alertas inteligentes"
];

const flowSteps = [
  "Monitorização",
  "Análise",
  "Classificação",
  "Importação para Leads"
];

const roadmapItems = [
  { id: "crm", label: "CRM", status: "done", icon: "✔" },
  { id: "cockpit", label: "Cockpit", status: "done", icon: "✔" },
  { id: "radar", label: "Radar", status: "progress", icon: "🟡" },
  { id: "ia", label: "Inteligência Artificial", status: "progress", icon: "🟡" },
  { id: "saas", label: "SaaS", status: "progress", icon: "🟡" }
];

export default function Radar() {
  const theme = useTheme();

  const styles = {
    page: {
      display: "grid",
      gap: theme.spacing.lg
    },
    hero: {
      display: "grid",
      gap: theme.spacing.sm,
      background: `linear-gradient(135deg, ${theme.colors.surface} 0%, ${theme.colors.surfaceSoft} 100%)`
    },
    title: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "2rem",
      lineHeight: 1.1
    },
    subtitle: {
      margin: 0,
      color: theme.colors.primary,
      fontSize: "1.05rem",
      fontWeight: 700
    },
    description: {
      margin: 0,
      color: theme.colors.muted,
      maxWidth: "72ch",
      lineHeight: 1.6
    },
    sectionTitle: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "1.2rem"
    },
    cardsGrid: {
      display: "grid",
      gap: theme.spacing.md,
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
    },
    moduleCard: {
      display: "grid",
      gap: theme.spacing.sm,
      minHeight: "150px",
      alignContent: "space-between"
    },
    moduleName: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "1.05rem"
    },
    flowCard: {
      display: "grid",
      gap: theme.spacing.sm
    },
    flowList: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "grid",
      gap: theme.spacing.xs
    },
    flowStep: {
      display: "grid",
      gap: theme.spacing.xs,
      color: theme.colors.text,
      fontWeight: 600
    },
    flowArrow: {
      color: theme.colors.muted,
      fontWeight: 700,
      lineHeight: 1,
      marginLeft: "2px"
    },
    roadmapCard: {
      display: "grid",
      gap: theme.spacing.sm
    },
    roadmapList: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "grid",
      gap: theme.spacing.xs
    },
    roadmapItem: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing.sm,
      color: theme.colors.text,
      fontWeight: 600
    },
    footer: {
      textAlign: "center",
      color: theme.colors.muted,
      margin: 0,
      lineHeight: 1.5
    }
  };

  return (
    <div style={styles.page}>
      <Card style={styles.hero}>
        <Badge variant="primary" style={{ width: "fit-content" }}>Novo módulo</Badge>
        <h1 style={styles.title}>OSFlow Radar</h1>
        <p style={styles.subtitle}>As oportunidades não esperam. O Radar encontra-as primeiro.</p>
        <p style={styles.description}>
          O Radar será a camada de prospeção inteligente da OSFlow para identificar sinais de oportunidade,
          priorizar ações comerciais e acelerar a entrada de novos registos no CRM com contexto operacional.
        </p>
      </Card>

      <section style={{ display: "grid", gap: theme.spacing.md }}>
        <h2 style={styles.sectionTitle}>Radar em construção</h2>
        <div style={styles.cardsGrid}>
          {cards.map((item) => (
            <Card key={item} style={styles.moduleCard}>
              <h3 style={styles.moduleName}>{item}</h3>
              <Badge variant="warning" style={{ width: "fit-content" }}>Em desenvolvimento</Badge>
            </Card>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: theme.spacing.md }}>
        <h2 style={styles.sectionTitle}>Como funcionará</h2>
        <Card style={styles.flowCard}>
          <ul style={styles.flowList}>
            {flowSteps.map((step, index) => (
              <li key={step} style={styles.flowStep}>
                <span>{step}</span>
                {index < flowSteps.length - 1 ? <span style={styles.flowArrow}>↓</span> : null}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section style={{ display: "grid", gap: theme.spacing.md }}>
        <h2 style={styles.sectionTitle}>Roadmap</h2>
        <Card style={styles.roadmapCard}>
          <ul style={styles.roadmapList}>
            {roadmapItems.map((item) => (
              <li key={item.id} style={styles.roadmapItem}>
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <Card>
        <p style={styles.footer}>
          Em breve, o Radar transformará a prospeção imobiliária numa operação inteligente.
        </p>
      </Card>
    </div>
  );
}
