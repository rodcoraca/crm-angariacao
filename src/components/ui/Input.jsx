import { forwardRef, useState } from "react";
import { useTheme } from "../../theme/ThemeContext";

const Input = forwardRef(function Input(
  {
    as = "input",
    label,
    hint,
    error,
    style,
    onFocus,
    onBlur,
    ...props
  },
  ref
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const commonStyle = {
    width: "100%",
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${error ? theme.colors.danger : focused ? theme.colors.focus : theme.colors.border}`,
    background: theme.colors.inputBackground,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    boxShadow: focused ? theme.shadow.sm : "none",
    ...style
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
    style: commonStyle,
    onFocus: handleFocus,
    onBlur: handleBlur
  };

  return (
    <div style={{ display: "grid", gap: theme.spacing.xs }}>
      {label ? <label style={{ color: theme.colors.text, fontWeight: 600 }}>{label}</label> : null}
      {as === "textarea" ? <textarea {...sharedProps} /> : <input {...sharedProps} />}
      {hint && !error ? <small style={{ color: theme.colors.muted }}>{hint}</small> : null}
      {error ? <small style={{ color: theme.colors.danger }}>{error}</small> : null}
    </div>
  );
});

export default Input;
