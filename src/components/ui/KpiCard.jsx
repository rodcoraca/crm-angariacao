import { useTheme } from "../../theme/ThemeContext";

export default function KpiCard({
  title,
  titulo,
  value,
  valor,
  icon,
  icone,
  tone,
  cor,
  trend,
  variacao,
  loading = false,
  descricao,
  style,
  ...props
}) {
  const theme = useTheme();

  const resolvedTitle = title || titulo || "Indicador";
  const resolvedValue = value || valor || "-";
  const resolvedIcon = icon || icone || "*";
  const resolvedTrend = trend || variacao || "Sem variacao";
  const resolvedTone = tone || cor || theme.colors.primary;

  return (
    <section
      {...props}
      style={{
        position: "relative",
        overflow: "hidden",
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.md,
        boxShadow: theme.elevation[1],
        padding: theme.spacing.md,
        display: "grid",
        gap: theme.spacing.sm,
        minHeight: "126px",
        fontFamily: theme.typography.fontFamily,
        color: theme.colors.text,
        ...style
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "auto -40px -40px auto",
          width: "120px",
          height: "120px",
          borderRadius: theme.borderRadius.full,
          background: theme.colors.surfaceSoft,
          opacity: 0.6
        }}
      />

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: theme.spacing.sm }}>
        <div style={{ display: "grid", gap: theme.spacing.xs }}>
          <span
            style={{
              fontSize: theme.typography.caption.fontSize,
              fontWeight: theme.typography.caption.fontWeight,
              color: theme.colors.muted
            }}
          >
            {resolvedTitle}
          </span>
          <strong style={{ fontSize: theme.typography.h2.fontSize, lineHeight: theme.typography.h2.lineHeight, fontWeight: theme.typography.h2.fontWeight }}>{loading ? "..." : resolvedValue}</strong>
        </div>

        <span
          aria-hidden="true"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: theme.borderRadius.md,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: theme.colors.surfaceSoft,
            color: resolvedTone,
            border: `1px solid ${resolvedTone}`,
            fontSize: theme.typography.cardTitle.fontSize
          }}
        >
          {resolvedIcon}
        </span>
      </header>

      <footer style={{ display: "grid", gap: theme.spacing.xs }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: theme.borderRadius.full,
            border: `1px solid ${resolvedTone}`,
            background: theme.colors.surfaceSoft,
            color: resolvedTone,
            fontSize: theme.typography.badge.fontSize,
            fontWeight: theme.typography.badge.fontWeight,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            width: "fit-content"
          }}
        >
          {resolvedTrend}
        </span>

        {descricao ? (
          <small style={{ color: theme.colors.muted, fontSize: theme.typography.caption.fontSize, lineHeight: theme.typography.caption.lineHeight, fontWeight: theme.typography.caption.fontWeight }}>{descricao}</small>
        ) : null}
      </footer>
    </section>
  );
}
