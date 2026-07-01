import { useTheme } from "../../theme/ThemeContext";

export default function Modal({ open = false, title, children, footer, onClose, style, ...props }) {
  const theme = useTheme();

  if (!open) return null;

  return (
    <div
      {...props}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(16, 34, 45, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing.lg,
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.shadow.lg,
          padding: theme.spacing.lg,
          width: "100%",
          maxWidth: "560px",
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamily,
          ...style
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {title ? <h3 style={{ margin: 0, marginBottom: theme.spacing.md, color: theme.colors.text }}>{title}</h3> : null}
        <div>{children}</div>
        {footer ? <div style={{ marginTop: theme.spacing.md }}>{footer}</div> : null}
      </div>
    </div>
  );
}
