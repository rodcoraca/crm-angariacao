import { useTheme } from "../../theme/ThemeContext";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  style,
  ...props
}) {
  const theme = useTheme();

  const variants = {
    primary: {
      background: theme.colors.primary,
      color: theme.colors.textLight,
      border: "none"
    },
    secondary: {
      background: theme.colors.secondary,
      color: theme.colors.textLight,
      border: "none"
    },
    danger: {
      background: theme.colors.danger,
      color: theme.colors.textLight,
      border: "none"
    },
    ghost: {
      background: theme.colors.surface,
      color: theme.colors.text,
      border: `1px solid ${theme.colors.border}`
    },
    light: {
      background: theme.colors.surfaceSoft,
      color: theme.colors.text,
      border: `1px solid ${theme.colors.border}`
    }
  };

  const sizes = {
    sm: {
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      fontSize: "0.85rem"
    },
    md: {
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      fontSize: "0.95rem"
    },
    lg: {
      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
      fontSize: "1rem"
    }
  };

  const selectedVariant = variants[variant] || variants.primary;
  const selectedSize = sizes[size] || sizes.md;

  return (
    <button
      {...props}
      type={props.type || "button"}
      disabled={disabled}
      style={{
        background: selectedVariant.background,
        color: selectedVariant.color,
        border: selectedVariant.border,
        borderRadius: theme.borderRadius.md,
        padding: selectedSize.padding,
        fontSize: selectedSize.fontSize,
        fontWeight: 600,
        fontFamily: theme.typography.fontFamily,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: theme.shadow.sm,
        opacity: disabled ? 0.7 : 1,
        width: fullWidth ? "100%" : "auto",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        ...style
      }}
    >
      {children}
    </button>
  );
}
