import { useTheme } from "../theme/ThemeContext";

export default function Button({ children, color = "primary", style, ...props }) {
  const theme = useTheme();
  const colors = {
    primary: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
    light: theme.colors.surface
  };

  const buttonColor = colors[color] || colors.primary;
  const textColor = color === "light" ? theme.colors.text : theme.colors.textLight;
  const border = color === "light" ? `1px solid ${theme.colors.border}` : "none";

  return (
    <button
      {...props}
      style={{
        background: buttonColor,
        color: textColor,
        border,
        borderRadius: theme.borderRadius.md,
        padding: "12px 18px",
        cursor: "pointer",
        fontWeight: 600,
        fontFamily: theme.typography.fontFamily,
        boxShadow: color === "light" ? "none" : theme.shadow.sm,
        transition: "transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
        opacity: 0.98,
        ...style
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = "translateY(-1px)";
        event.currentTarget.style.opacity = "1";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "translateY(0)";
        event.currentTarget.style.opacity = "0.98";
      }}
    >
      {children}
    </button>
  );
}
