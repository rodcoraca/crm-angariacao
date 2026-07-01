import { useTheme } from "../../theme/ThemeContext";

export default function Loading({ label = "A carregar...", style }) {
  const theme = useTheme();

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: theme.spacing.sm, padding: theme.spacing.lg, color: theme.colors.muted, fontFamily: theme.typography.fontFamily, ...style }}>
      <span style={{ display: "inline-block", width: "14px", height: "14px", borderRadius: "50%", border: `2px solid ${theme.colors.border}`, borderTopColor: theme.colors.primary, animation: "spin 0.8s linear infinite" }} />
      <span>{label}</span>
    </div>
  );
}
