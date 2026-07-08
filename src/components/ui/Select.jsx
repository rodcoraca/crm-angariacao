import { useMemo } from "react";
import { useTheme } from "../../theme/ThemeContext";
import { useState } from "react";

export default function Select({
  label,
  hint,
  error,
  options = [],
  placeholder,
  size = "md",
  fullWidth = true,
  disabled = false,
  style,
  selectStyle,
  ...props
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  const sizeStyles = useMemo(
    () => ({
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
    }),
    [theme]
  );

  const selectedSize = sizeStyles[size] || sizeStyles.md;

  const baseSelectStyle = {
    width: fullWidth ? "100%" : "auto",
    minHeight: selectedSize.minHeight,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${error ? theme.colors.danger : focused ? theme.colors.focus : hovered ? theme.colors.primary : theme.colors.border}`,
    background: disabled ? theme.colors.surfaceSoft : theme.colors.inputBackground,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily,
    fontSize: selectedSize.fontSize,
    padding: selectedSize.padding,
    outline: "none",
    boxSizing: "border-box",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    transition: "border-color 200ms ease, box-shadow 200ms ease, background-color 200ms ease",
    boxShadow: error ? `0 0 0 2px ${theme.colors.statusDangerBorder}` : focused ? theme.elevation[1] : theme.elevation[0]
  };

  return (
    <div style={{ display: "grid", gap: theme.spacing.xs, width: fullWidth ? "100%" : "auto", ...style }}>
      {label ? (
        <label style={{ color: theme.colors.text, fontSize: theme.typography.caption.fontSize, fontWeight: theme.typography.cardTitle.fontWeight }}>{label}</label>
      ) : null}

      <select
        {...props}
        disabled={disabled}
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
        style={{ ...baseSelectStyle, ...selectStyle }}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => {
          if (typeof option === "string") {
            return (
              <option key={option} value={option}>
                {option}
              </option>
            );
          }

          return (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          );
        })}
      </select>

      {hint && !error ? <small style={{ color: theme.colors.muted, fontSize: theme.typography.caption.fontSize, fontWeight: theme.typography.caption.fontWeight }}>{hint}</small> : null}
      {error ? <small style={{ color: theme.colors.danger, fontSize: theme.typography.caption.fontSize, fontWeight: theme.typography.caption.fontWeight }}>{error}</small> : null}
    </div>
  );
}
