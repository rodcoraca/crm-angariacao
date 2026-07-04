import { useTheme } from "../../theme/ThemeContext";
import Card from "../ui/Card";
import Badge from "../ui/Badge";

export default function CockpitList({ items = [] }) {
  const theme = useTheme();

  return (
    <div style={{ display: "grid", gap: theme.spacing.sm }}>
      {items.map((item) => (
        <Card
          key={item.id || item.key || item.title || item.badge || "cockpit-list-item"}
          style={{
            padding: theme.spacing.md,
            display: "grid",
            gap: theme.spacing.xs,
            boxShadow: "none",
            borderStyle: "dashed"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.sm,
              flexWrap: "wrap"
            }}
          >
            <strong style={{ color: theme.colors.text }}>{item.title}</strong>
            {item.badge ? <Badge variant={item.variant || "neutral"}>{item.badge}</Badge> : null}
          </div>

          {item.description ? (
            <p style={{ margin: 0, color: theme.colors.muted, fontSize: "0.9rem", lineHeight: 1.45 }}>
              {item.description}
            </p>
          ) : null}

          {item.meta ? <small style={{ color: theme.colors.muted }}>{item.meta}</small> : null}
        </Card>
      ))}
    </div>
  );
}
