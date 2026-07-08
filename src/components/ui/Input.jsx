import { forwardRef, useState } from "react";
import { useTheme } from "../../theme/ThemeContext";

const Input = forwardRef(function Input(
  {
    as = "input",
    label,
    hint,
    error,
    size = "md",
    fullWidth = true,
    disabled = false,
    style,
    inputStyle,
    onFocus,
    onBlur,
    ...props
  },
  ref
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  const sizeStyles = {
    sm: {
      minHeight: "36px",
      fontSize: theme.typography.body.fontSize,
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`
    },
    md: {
      minHeight: "40px",
      fontSize: theme.typography.body.fontSize,
      padding: `${theme.spacing.sm} ${theme.spacing.md}`
    },
    lg: {
      minHeight: "44px",
      fontSize: theme.typography.cardTitle.fontSize,
      padding: `${theme.spacing.sm} ${theme.spacing.lg}`
    }
  };

  const selectedSize = sizeStyles[size] || sizeStyles.md;

  const commonStyle = {
    width: fullWidth ? "100%" : "auto",
    minHeight: selectedSize.minHeight,
    padding: selectedSize.padding,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${error ? theme.colors.danger : focused ? theme.colors.focus : hovered ? theme.colors.primary : theme.colors.border}`,
    background: disabled ? theme.colors.surfaceSoft : theme.colors.inputBackground,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily,
    fontSize: selectedSize.fontSize,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 200ms ease, box-shadow 200ms ease, background-color 200ms ease",
    boxShadow: error ? `0 0 0 2px ${theme.colors.statusDangerBorder}` : focused ? theme.elevation[1] : theme.elevation[0],
    cursor: disabled ? "not-allowed" : "text",
    opacity: disabled ? 0.7 : 1,
    ...inputStyle
  };

  const handleFocus = (event) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event) => {
    setFocused(false);
    onBlur?.(event);
  };

  const sharedProps = {
    ...props,
    ref,
    disabled,
    style: commonStyle,
    onMouseEnter: (event) => {
      setHovered(true);
      props.onMouseEnter?.(event);
    },
    onMouseLeave: (event) => {
      setHovered(false);
      props.onMouseLeave?.(event);
    },
    onFocus: handleFocus,
    onBlur: handleBlur
  };

  return (
    <div style={{ display: "grid", gap: theme.spacing.xs, width: fullWidth ? "100%" : "auto", ...style }}>
      {label ? <label style={{ color: theme.colors.text, fontSize: theme.typography.caption.fontSize, fontWeight: theme.typography.cardTitle.fontWeight }}>{label}</label> : null}
      {as === "textarea" ? <textarea {...sharedProps} /> : <input {...sharedProps} />}
      {hint && !error ? <small style={{ color: theme.colors.muted, fontSize: theme.typography.caption.fontSize, fontWeight: theme.typography.caption.fontWeight }}>{hint}</small> : null}
      {error ? <small style={{ color: theme.colors.danger, fontSize: theme.typography.caption.fontSize, fontWeight: theme.typography.caption.fontWeight }}>{error}</small> : null}
    </div>
  );
});

export default Input;
