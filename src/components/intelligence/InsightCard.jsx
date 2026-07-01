import { useTheme } from "../../theme/ThemeContext";
import Card from "../ui/Card";
import Badge from "../ui/Badge";

export default function InsightCard({ titulo, descricao, icone, tipo = "info" }) {
  const theme = useTheme();

  const typeVariant = {
    info: "primary",
    alerta: "warning",
    sucesso: "success",
    risco: "danger"
  };

  const variant = typeVariant[tipo] || "primary";

  return (
    <Card style={{ display: "grid", gap: theme.spacing.sm, padding: theme.spacing.md }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm }}>
        <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
          {icone ? <span aria-hidden="true">{icone}</span> : null}
          <strong style={{ color: theme.colors.text }}>{titulo}</strong>
        </div>
        <Badge variant={variant}>{tipo}</Badge>
      </div>

      <p style={{ margin: 0, color: theme.colors.muted, lineHeight: 1.5 }}>
        {descricao}
      </p>
    </Card>
  );
}
