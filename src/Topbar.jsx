import { useTheme } from "./theme/ThemeContext";

export default function Topbar({ children }) {
  const theme = useTheme();

  return (
    <header
      style={{
        height: "70px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `0 ${theme.spacing.lg}`,
        background: theme.colors.surface,
        color: theme.colors.text,
        borderBottom: `1px solid ${theme.colors.border}`,
        boxShadow: "0 2px 12px rgba(15, 23, 42, 0.04)",
        fontWeight: 600
      }}
    >
      <div style={{ fontSize: "1rem", letterSpacing: "0.02em" }}>{children}</div>
    </header>
  );
}
