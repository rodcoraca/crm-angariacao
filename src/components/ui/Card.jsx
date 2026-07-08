import { useTheme } from "../../theme/ThemeContext";
import { useState } from "react";

export default function Card({
  children,
  variant = "surface",
  padding = "lg",
  interactive = false,
  style,
  ...props
}) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const variants = {
    surface: {
      background: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      boxShadow: theme.elevation[1]
    },
    soft: {
      background: theme.colors.surfaceSoft,
      border: `1px solid ${theme.colors.border}`,
      boxShadow: theme.elevation[0]
    },
    elevated: {
      background: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      boxShadow: theme.elevation[2]
    }
  };

  const resolvedVariant = variants[variant] || variants.surface;
  const resolvedPadding = theme.spacing[padding] || padding || theme.layout.padding;
  const isClickable = interactive || typeof props.onClick === "function";

  return (
    <section
      {...props}
      data-clickable={isClickable ? "true" : "false"}
      tabIndex={isClickable ? (props.tabIndex ?? 0) : props.tabIndex}
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
        background: resolvedVariant.background,
        border: resolvedVariant.border,
        borderRadius: theme.borderRadius.md,
        boxShadow: focused && isClickable ? theme.elevation[2] : hovered && isClickable ? theme.elevation[2] : resolvedVariant.boxShadow,
        padding: resolvedPadding,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        transition: isClickable ? "transform 200ms ease, box-shadow 200ms ease" : undefined,
        transform: hovered && isClickable ? "translateY(-2px)" : "translateY(0)",
        cursor: isClickable ? "pointer" : "default",
        ...style
      }}
    >
      {children}
    </section>
  );
}
