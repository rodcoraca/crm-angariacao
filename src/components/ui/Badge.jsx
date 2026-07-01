import { useTheme } from "../../theme/ThemeContext";

export default function Badge({ children, variant = "neutral", style, ...props }) {
  const theme = useTheme();

  const variants = {
    neutral: {
      background: theme.colors.surfaceSoft,
      color: theme.colors.text
    },
    primary: {
      background: `${theme.colors.primary}14`,
      color: theme.colors.primary
    },
    success: {
      background: `${theme.colors.success}14`,
      color: theme.colors.success
    },
    warning: {
      background: `${theme.colors.warning}14`,
      color: theme.colors.warning
    },
    danger: {
      background: `${theme.colors.danger}14`,
      color: theme.colors.danger
    }
  };

  const selected = variants[variant] || variants.neutral;

  return (
    <span
      {...props}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
        borderRadius: theme.borderRadius.full || "999px",
        fontSize: "0.85rem",
        fontWeight: 700,
        fontFamily: theme.typography.fontFamily,
        background: selected.background,
        color: selected.color,
        ...style
      }}
    >
      {children}
    </span>
  );
}
