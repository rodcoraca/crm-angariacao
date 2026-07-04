import { useTheme } from "../../theme/ThemeContext";

export default function KpiCard({
  titulo,
  valor,
  icone,
  cor,
  variacao,
  descricao,
  style,
  ...props
}) {
  const theme = useTheme();

  const tone = cor || theme.colors.primary;

  return (
    <section
      {...props}
      style={{
        position: "relative",
        overflow: "hidden",
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadow.sm,
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
          borderRadius: "999px",
          background: `${tone}1a`
        }}
      />

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: theme.spacing.sm }}>
        <div style={{ display: "grid", gap: theme.spacing.xs }}>
          <span
            style={{
              fontSize: "0.82rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: theme.colors.muted
            }}
          >
            {titulo}
          </span>
          <strong style={{ fontSize: "1.9rem", lineHeight: 1, fontWeight: 700 }}>{valor}</strong>
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
            background: `${tone}1a`,
            color: tone,
            border: `1px solid ${tone}33`,
            fontSize: "1rem"
          }}
        >
          {icone || "*"}
        </span>
      </header>

      <footer style={{ display: "grid", gap: theme.spacing.xs }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: "999px",
            border: `1px solid ${tone}33`,
            background: `${tone}14`,
            color: tone,
            fontSize: "0.78rem",
            fontWeight: 700,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            width: "fit-content"
          }}
        >
          {variacao || "Sem variacao"}
        </span>

        {descricao ? (
          <small style={{ color: theme.colors.muted, fontSize: "0.78rem", lineHeight: 1.4 }}>{descricao}</small>
        ) : null}
      </footer>
    </section>
  );
}
