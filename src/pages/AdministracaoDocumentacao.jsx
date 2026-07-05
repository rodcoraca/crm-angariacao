import { useTheme } from "../theme/ThemeContext";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";

const DOCUMENTOS = [
  { id: "arquitetura", label: "Arquitetura" },
  { id: "banco_dados", label: "Banco de Dados" },
  { id: "roadmap", label: "Roadmap" },
  { id: "saas", label: "SaaS" },
  { id: "seguranca", label: "Segurança" },
  { id: "changelog", label: "Changelog" }
];

export default function AdministracaoDocumentacao({ selectedDoc = "arquitetura" }) {
  const theme = useTheme();

  const docSelecionado = DOCUMENTOS.find((doc) => doc.id === selectedDoc) || DOCUMENTOS[0];

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
      fontSize: "1.9rem",
      lineHeight: 1.1
    },
    subtitle: {
      margin: 0,
      color: theme.colors.muted,
      lineHeight: 1.5,
      maxWidth: "68ch"
    },
    docsGrid: {
      display: "grid",
      gap: theme.spacing.md,
      gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))"
    },
    docCard: {
      display: "grid",
      gap: theme.spacing.sm,
      minHeight: "130px",
      alignContent: "space-between"
    },
    docName: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "1.02rem"
    },
    currentDoc: {
      margin: 0,
      color: theme.colors.muted,
      fontSize: "0.95rem"
    }
  };

  return (
    <div style={styles.page}>
      <Card style={styles.hero}>
        <Badge variant="primary" style={{ width: "fit-content" }}>Administração</Badge>
        <h1 style={styles.title}>Documentação</h1>
        <p style={styles.subtitle}>
          Área institucional de referência documental da OSFlow para arquitetura, produto,
          segurança e evolução estratégica da plataforma.
        </p>
        <p style={styles.currentDoc}>Documento selecionado no menu: {docSelecionado.label}</p>
      </Card>

      <div style={styles.docsGrid}>
        {DOCUMENTOS.map((doc) => (
          <Card key={doc.id} style={styles.docCard}>
            <h2 style={styles.docName}>{doc.label}</h2>
            <Badge variant={doc.id === docSelecionado.id ? "primary" : "neutral"} style={{ width: "fit-content" }}>
              {doc.id === docSelecionado.id ? "Selecionado" : "Disponível"}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
