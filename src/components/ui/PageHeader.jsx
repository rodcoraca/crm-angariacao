import { useTheme } from "../../theme/ThemeContext";
import Breadcrumb from "./Breadcrumb";

export default function PageHeader({
  title,
  subtitle,
  breadcrumb = [],
  actions,
  eyebrow,
  compact = false,
  style
}) {
  const theme = useTheme();

  return (
    <header
      style={{
        display: "grid",
        gap: compact ? theme.spacing.xs : theme.spacing.sm,
        padding: compact ? `${theme.spacing.sm} 0` : `${theme.spacing.md} 0`,
        borderBottom: `1px solid ${theme.colors.border}`,
        ...style
      }}
    >
      {breadcrumb.length ? <Breadcrumb items={breadcrumb} /> : null}

      <div style={{ display: "flex", gap: theme.spacing.md, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: theme.spacing.xs }}>
          {eyebrow ? <span style={{ color: theme.colors.muted, fontSize: theme.typography.caption.fontSize, fontWeight: theme.typography.caption.fontWeight }}>{eyebrow}</span> : null}
          <h1 style={{ margin: 0, color: theme.colors.text, fontSize: compact ? theme.typography.h2.fontSize : theme.typography.h1.fontSize, fontWeight: theme.typography.h1.fontWeight, lineHeight: theme.typography.h1.lineHeight }}>{title}</h1>
          {subtitle ? <p style={{ margin: 0, color: theme.colors.muted, lineHeight: theme.typography.body.lineHeight, fontSize: theme.typography.body.fontSize, fontWeight: theme.typography.body.fontWeight }}>{subtitle}</p> : null}
        </div>

        {actions ? <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm, flexWrap: "wrap" }}>{actions}</div> : null}
      </div>
    </header>
  );
}
