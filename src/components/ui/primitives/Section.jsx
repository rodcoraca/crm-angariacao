import { useTheme } from "../../../theme/ThemeContext";

export default function Section({ title, subtitle, actions, children, style, contentStyle }) {
  const theme = useTheme();

  return (
    <section style={{ display: "grid", gap: theme.layout.gap, ...style }}>
      {title || subtitle || actions ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: theme.spacing.xs }}>
            {title ? (
              <h2
                style={{
                  margin: 0,
                  color: theme.colors.text,
                  fontSize: theme.typography.h2.fontSize,
                  fontWeight: theme.typography.h2.fontWeight,
                  lineHeight: theme.typography.h2.lineHeight
                }}
              >
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p
                style={{
                  margin: 0,
                  color: theme.colors.muted,
                  fontSize: theme.typography.body.fontSize,
                  fontWeight: theme.typography.body.fontWeight,
                  lineHeight: theme.typography.body.lineHeight
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm, flexWrap: "wrap" }}>{actions}</div> : null}
        </div>
      ) : null}
      <div style={contentStyle}>{children}</div>
    </section>
  );
}
