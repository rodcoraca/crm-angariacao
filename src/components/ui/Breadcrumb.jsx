import { useTheme } from "../../theme/ThemeContext";

export default function Breadcrumb({
  items = [],
  separator = "/",
  style,
  itemStyle,
  activeItemStyle
}) {
  const theme = useTheme();

  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: theme.spacing.xs, ...style }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={`${item.label}_${index}`} style={{ display: "inline-flex", alignItems: "center", gap: theme.spacing.xs }}>
            {item.href && !isLast ? (
              <a
                href={item.href}
                onClick={item.onClick}
                style={{
                  color: theme.colors.muted,
                  textDecoration: "none",
                  fontSize: theme.typography.caption.fontSize,
                  fontWeight: theme.typography.caption.fontWeight,
                  ...itemStyle
                }}
              >
                {item.label}
              </a>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                style={{
                  color: isLast ? theme.colors.text : theme.colors.muted,
                  fontSize: theme.typography.caption.fontSize,
                  fontWeight: isLast ? theme.typography.cardTitle.fontWeight : theme.typography.caption.fontWeight,
                  ...itemStyle,
                  ...(isLast ? activeItemStyle : null)
                }}
              >
                {item.label}
              </span>
            )}

            {!isLast ? <span style={{ color: theme.colors.muted, opacity: 0.7 }}>{separator}</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
