import { useTheme } from "../../theme/ThemeContext";
import Card from "../ui/Card";

export default function CockpitMetricTiles({ items = [] }) {
  const theme = useTheme();

  return (
    <div
      style={{
        display: "grid",
        gap: theme.spacing.sm,
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))"
      }}
    >
      {items.map((item) => (
        <Card
          key={item.id || item.key || item.label || "cockpit-metric-item"}
          style={{
            padding: theme.spacing.md,
            boxShadow: "none",
            borderStyle: "dashed",
            display: "grid",
            gap: theme.spacing.xs
          }}
        >
          <small
            style={{
              color: theme.colors.muted,
              textTransform: "uppercase",
              fontWeight: 700,
              letterSpacing: "0.03em"
            }}
          >
            {item.label}
          </small>
          <strong style={{ color: theme.colors.text, fontSize: "1.45rem", lineHeight: 1 }}>{item.value}</strong>
          {item.hint ? <small style={{ color: theme.colors.muted }}>{item.hint}</small> : null}
        </Card>
      ))}
    </div>
  );
}
