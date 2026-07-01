import { useTheme } from "../../theme/ThemeContext";
import Card from "../ui/Card";
import Badge from "../ui/Badge";

export default function ActivityFeed({ items = [] }) {
  const theme = useTheme();

  const typeVariant = {
    lead: "primary",
    imovel: "success",
    agenda: "warning",
    documento: "neutral"
  };

  if (!items.length) {
    return (
      <Card style={{ display: "grid", gap: theme.spacing.sm }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: theme.colors.text }}>Atividade recente</h3>
          <Badge variant="neutral">Sem eventos</Badge>
        </div>

        <p style={{ margin: 0, color: theme.colors.muted }}>
          Nenhuma atividade para apresentar neste momento.
        </p>
      </Card>
    );
  }

  return (
    <Card style={{ display: "grid", gap: theme.spacing.md }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, color: theme.colors.text }}>Atividade recente</h3>
        <Badge variant="primary">{items.length} eventos</Badge>
      </div>

      <div style={{ display: "grid", gap: theme.spacing.sm }}>
        {items.map((item, index) => {
          const variant = typeVariant[item.tipo] || "neutral";

          return (
            <Card
              key={`${item.titulo}-${index}`}
              style={{
                display: "grid",
                gap: theme.spacing.xs,
                padding: theme.spacing.md,
                boxShadow: "none"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: theme.spacing.sm }}>
                <strong style={{ color: theme.colors.text }}>{item.titulo}</strong>
                <Badge variant={variant}>{item.tipo || "evento"}</Badge>
              </div>

              <p style={{ margin: 0, color: theme.colors.muted, lineHeight: 1.5 }}>
                {item.descricao}
              </p>

              <small style={{ color: theme.colors.muted, opacity: 0.9 }}>
                {item.hora}
              </small>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
