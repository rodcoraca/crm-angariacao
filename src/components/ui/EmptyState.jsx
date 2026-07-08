import { useTheme } from "../../theme/ThemeContext";
import Card from "./Card";

export default function EmptyState({
  title,
  description,
  action,
  icon,
  variant = "default",
  style
}) {
  const theme = useTheme();

  const variants = {
    default: {
      padding: theme.spacing.xl,
      titleSize: theme.typography.cardTitle.fontSize,
      descSize: theme.typography.body.fontSize
    },
    compact: {
      padding: theme.spacing.md,
      titleSize: theme.typography.cardTitle.fontSize,
      descSize: theme.typography.caption.fontSize
    }
  };

  const selected = variants[variant] || variants.default;

  return (
    <Card data-clickable="false" style={{ textAlign: "center", padding: selected.padding, ...style }}>
      {icon ? (
        <div style={{ marginBottom: theme.spacing.sm, color: theme.colors.muted, fontSize: "1.15rem" }} aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h3 style={{ margin: 0, marginBottom: theme.spacing.sm, color: theme.colors.text, fontSize: selected.titleSize, fontWeight: theme.typography.cardTitle.fontWeight }}>{title}</h3>
      {description ? <p style={{ margin: 0, color: theme.colors.muted, fontSize: selected.descSize, fontWeight: theme.typography.body.fontWeight }}>{description}</p> : null}
      {action ? <div style={{ marginTop: theme.spacing.md }}>{action}</div> : null}
    </Card>
  );
}
