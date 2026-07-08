import { useTheme } from "../../theme/ThemeContext";
import { useState } from "react";

export default function Button({
  children,
  color,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  ...props
}) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

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

  const legacyColorMap = {
    primary: "primary",
    success: "secondary",
    warning: "secondary",
    danger: "danger",
    light: "light"
  };

  const resolvedVariant = color ? (legacyColorMap[color] || variant) : variant;

  const sizes = {
    sm: {
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      minHeight: "36px",
      fontSize: theme.typography.body.fontSize
    },
    md: {
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      minHeight: "40px",
      fontSize: theme.typography.body.fontSize
    },
    lg: {
      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
      minHeight: "44px",
      fontSize: theme.typography.cardTitle.fontSize
    }
  };

  const selectedVariant = variants[resolvedVariant] || variants.primary;
  const selectedSize = sizes[size] || sizes.md;
  const isDisabled = disabled || loading;
  const interactionEnabled = !isDisabled;

  const hoverShadow = resolvedVariant === "ghost" || resolvedVariant === "light"
    ? theme.elevation[1]
    : theme.elevation[2];

  const baseShadow = resolvedVariant === "ghost" || resolvedVariant === "light"
    ? theme.elevation[0]
    : theme.elevation[1];

  return (
    <button
      {...props}
      type={props.type || "button"}
      disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      data-clickable={interactionEnabled ? "true" : "false"}
      onMouseEnter={(event) => {
        setHovered(true);
        props.onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setHovered(false);
        props.onMouseLeave?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        props.onBlur?.(event);
      }}
      style={{
        background: selectedVariant.background,
        color: selectedVariant.color,
        border: selectedVariant.border,
        borderRadius: theme.borderRadius.md,
        minHeight: selectedSize.minHeight,
        padding: selectedSize.padding,
        fontSize: selectedSize.fontSize,
        fontWeight: theme.typography.cardTitle.fontWeight,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.xs,
        fontFamily: theme.typography.fontFamily,
        cursor: isDisabled ? "not-allowed" : "pointer",
        boxShadow: focused ? theme.elevation[2] : hovered && interactionEnabled ? hoverShadow : baseShadow,
        opacity: isDisabled ? 0.7 : 1,
        width: fullWidth ? "100%" : "auto",
        transform: hovered && interactionEnabled ? "translateY(-2px)" : "translateY(0)",
        transition: "transform 200ms ease, box-shadow 200ms ease, opacity 200ms ease",
        ...style
      }}
    >
      {loading ? (
        <span
          aria-hidden="true"
          style={{
            width: "14px",
            height: "14px",
            borderRadius: theme.borderRadius.full,
            border: `2px solid ${selectedVariant.color}66`,
            borderTopColor: selectedVariant.color,
            animation: "osflow-button-spin .7s linear infinite"
          }}
        />
      ) : null}
      {!loading && leftIcon ? <span aria-hidden="true">{leftIcon}</span> : null}
      <span>{children}</span>
      {!loading && rightIcon ? <span aria-hidden="true">{rightIcon}</span> : null}
      <style>{`@keyframes osflow-button-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
