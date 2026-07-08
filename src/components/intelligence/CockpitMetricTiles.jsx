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
            boxShadow: theme.elevation[0],
            borderStyle: "dashed",
            display: "grid",
            gap: theme.spacing.xs
          }}
        >
          <small
            style={{
              color: theme.colors.muted,
              fontWeight: theme.typography.caption.fontWeight,
              fontSize: theme.typography.caption.fontSize
            }}
          >
            {item.label}
          </small>
          <strong style={{ color: theme.colors.text, fontSize: theme.typography.h2.fontSize, lineHeight: theme.typography.h2.lineHeight, fontWeight: theme.typography.h2.fontWeight }}>{item.value}</strong>
          {item.hint ? <small style={{ color: theme.colors.muted, fontSize: theme.typography.caption.fontSize, fontWeight: theme.typography.caption.fontWeight }}>{item.hint}</small> : null}
        </Card>
      ))}
    </div>
  );
}
