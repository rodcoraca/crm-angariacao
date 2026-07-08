import { useTheme } from "../../theme/ThemeContext";

export default function Badge({
  children,
  variant = "neutral",
  size = "md",
  outlined = false,
  style,
  ...props
}) {
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

  const sizes = {
    sm: {
      fontSize: theme.typography.badge.fontSize,
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`
    },
    md: {
      fontSize: theme.typography.badge.fontSize,
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`
    },
    lg: {
      fontSize: theme.typography.badge.fontSize,
      padding: `${theme.spacing.sm} ${theme.spacing.md}`
    }
  };

  const selectedSize = sizes[size] || sizes.md;

  return (
    <span
      {...props}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: selectedSize.padding,
        borderRadius: theme.borderRadius.full,
        fontSize: selectedSize.fontSize,
        fontWeight: theme.typography.badge.fontWeight,
        fontFamily: theme.typography.fontFamily,
        background: outlined ? "transparent" : selected.background,
        border: outlined ? `1px solid ${selected.color}66` : "none",
        color: selected.color,
        ...style
      }}
    >
      {children}
    </span>
  );
}
