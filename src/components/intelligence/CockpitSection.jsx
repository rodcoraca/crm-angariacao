import { useTheme } from "../../theme/ThemeContext";
import Card from "../ui/Card";
import Badge from "../ui/Badge";

export default function CockpitSection({
  title,
  subtitle,
  badge,
  badgeVariant = "neutral",
  children,
  style,
  bodyStyle
}) {
  const theme = useTheme();

  return (
    <Card
      style={{
        display: "grid",
        gap: theme.spacing.md,
        background: `linear-gradient(180deg, ${theme.colors.surface} 0%, ${theme.colors.surfaceSoft} 100%)`,
        ...style
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "start",
          justifyContent: "space-between",
          gap: theme.spacing.sm,
          flexWrap: "wrap"
        }}
      >
        <div style={{ display: "grid", gap: theme.spacing.xs }}>
          <h3 style={{ margin: 0, color: theme.colors.text, fontSize: "1.05rem" }}>{title}</h3>
          {subtitle ? (
            <p style={{ margin: 0, color: theme.colors.muted, fontSize: "0.9rem" }}>{subtitle}</p>
          ) : null}
        </div>

        {badge ? <Badge variant={badgeVariant}>{badge}</Badge> : null}
      </header>

      <div style={{ display: "grid", gap: theme.spacing.sm, ...bodyStyle }}>{children}</div>
    </Card>
  );
}
