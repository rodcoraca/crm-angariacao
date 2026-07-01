import { useTheme } from "../theme/ThemeContext";

export default function Footer({ children, style, ...props }) {
  const theme = useTheme();

  if (!children) return null;

  return (
    <footer
      {...props}
      style={{
        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
        borderTop: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface,
        color: theme.colors.muted,
        fontFamily: theme.typography.fontFamily,
        fontSize: "0.9rem",
        ...style
      }}
    >
      {children}
    </footer>
  );
}
