import { useTheme } from "../../theme/ThemeContext";

export default function FloatingWindowBody({ children, style = {} }) {
  const theme = useTheme();

  return (
    <div style={{
      flex: 1,
      overflowY: "auto",
      padding: theme.spacing.sm,
      display: "grid",
      gap: theme.spacing.sm,
      ...style
    }}>
      {children}
    </div>
  );
}
