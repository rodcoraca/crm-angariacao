import { useTheme } from "../../theme/ThemeContext";

export default function Card({ children, style, ...props }) {
  const theme = useTheme();

  return (
    <section
      {...props}
      style={{
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadow.sm,
        padding: theme.spacing.lg,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        ...style
      }}
    >
      {children}
    </section>
  );
}
