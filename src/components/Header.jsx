import { useTheme } from "../theme/ThemeContext";

export default function Header({ children, style, ...props }) {
  const theme = useTheme();
  return (
    <header
      {...props}
      style={{
        padding: theme.spacing.md,
        borderBottom: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        ...style
      }}
    >
      {children}
    </header>
  );
}
