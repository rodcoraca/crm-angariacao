import { useTheme } from "../theme/ThemeContext";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";

export default function Forbidden({ requestedView, requiredPermission }) {
  const theme = useTheme();

  return (
    <div style={{ display: "grid", gap: theme.spacing.lg }}>
      <Card
        style={{
          display: "grid",
          gap: theme.spacing.sm,
          background: `linear-gradient(135deg, ${theme.colors.surface} 0%, ${theme.colors.surfaceSoft} 100%)`
        }}
      >
        <Badge variant="danger" style={{ width: "fit-content" }}>403</Badge>
        <h1 style={{ margin: 0, color: theme.colors.text, fontSize: "1.8rem" }}>Acesso negado</h1>
        <p style={{ margin: 0, color: theme.colors.muted }}>
          Não possui permissão para aceder a esta página.
        </p>
        {requestedView ? (
          <p style={{ margin: 0, color: theme.colors.muted }}>
            Rota: {requestedView}
          </p>
        ) : null}
        {requiredPermission ? (
          <p style={{ margin: 0, color: theme.colors.muted }}>
            Permissão necessária: {requiredPermission}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
