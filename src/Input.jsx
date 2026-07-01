import { useState } from "react";
import { useTheme } from "./theme/ThemeContext";

export default function Input({ as = "input", style, onFocus, onBlur, ...props }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const commonStyle = {
    width: "100%",
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${focused ? theme.colors.focus : theme.colors.border}`,
    background: theme.colors.inputBackground,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize,
    outline: "none",
    boxSizing: "border-box",
    transition: "border 0.2s ease, box-shadow 0.2s ease",
    boxShadow: focused ? theme.shadow.sm : "none",
    ...style
  };

  const handleFocus = (event) => {
    setFocused(true);
    if (onFocus) onFocus(event);
  };

  const handleBlur = (event) => {
    setFocused(false);
    if (onBlur) onBlur(event);
  };

  const commonProps = {
    ...props,
    style: commonStyle,
    onFocus: handleFocus,
    onBlur: handleBlur
  };

  return as === "textarea" ? <textarea {...commonProps} /> : <input {...commonProps} />;
}
