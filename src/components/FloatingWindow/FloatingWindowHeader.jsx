import { useTheme } from "../../theme/ThemeContext";

export default function FloatingWindowHeader({ title, minimized, onDragStart, onMinimize, onClose }) {
  const theme = useTheme();

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    cursor: onDragStart ? "move" : "default",
    background: theme.colors.surfaceSoft,
    borderBottom: `1px solid ${theme.colors.border}`,
    borderRadius: `${theme.borderRadius.lg} ${theme.borderRadius.lg} 0 0`,
    userSelect: "none",
    flexShrink: 0
  };

  const actionsStyle = {
    display: "flex",
    gap: "4px",
    alignItems: "center"
  };

  const btnStyle = {
    background: "none",
    border: `1px solid ${theme.colors.border}`,
    cursor: "pointer",
    color: theme.colors.muted,
    fontSize: "0.85rem",
    padding: "2px 8px",
    borderRadius: theme.borderRadius.sm,
    fontFamily: theme.typography.fontFamily,
    lineHeight: 1.4
  };

  return (
    <div style={headerStyle} onMouseDown={onDragStart || undefined}>
      <span style={{ color: theme.colors.text, fontSize: "0.95rem" }}>{title}</span>
      <div style={actionsStyle}>
        {onMinimize && (
          <button type="button" style={btnStyle} title={minimized ? "Restaurar" : "Minimizar"} onClick={onMinimize}>
            {minimized ? "□" : "—"}
          </button>
        )}
        <button type="button" style={btnStyle} title="Fechar" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}
