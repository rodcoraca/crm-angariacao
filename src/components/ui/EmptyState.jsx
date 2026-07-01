import { useTheme } from "../../theme/ThemeContext";
import Card from "./Card";

export default function EmptyState({ title, description, action, style }) {
  const theme = useTheme();

  return (
    <Card style={{ textAlign: "center", padding: theme.spacing.xl, ...style }}>
      <h3 style={{ margin: 0, marginBottom: theme.spacing.sm, color: theme.colors.text }}>{title}</h3>
      {description ? <p style={{ margin: 0, color: theme.colors.muted }}>{description}</p> : null}
      {action ? <div style={{ marginTop: theme.spacing.md }}>{action}</div> : null}
    </Card>
  );
}
