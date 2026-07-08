import { useTheme } from "../../theme/ThemeContext";

export default function FilterBar({
  children,
  actions,
  sticky = false,
  compact = false,
  style
}) {
  const theme = useTheme();

  return (
    <section
      style={{
        position: sticky ? "sticky" : "static",
        top: sticky ? 0 : "auto",
        zIndex: sticky ? 20 : "auto",
        display: "grid",
        gap: compact ? theme.spacing.xs : theme.spacing.sm,
        padding: compact ? theme.spacing.sm : theme.layout.padding,
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.md,
        boxShadow: theme.elevation[1],
        ...style
      }}
    >
      <div style={{ display: "grid", gap: theme.spacing.sm, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {children}
      </div>

      {actions ? (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: theme.spacing.sm, flexWrap: "wrap" }}>
          {actions}
        </div>
      ) : null}
    </section>
  );
}
