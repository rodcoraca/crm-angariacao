import { useTheme } from "../../theme/ThemeContext";
import { useEffect } from "react";

export default function Modal({
  open = false,
  title,
  children,
  footer,
  onClose,
  size = "md",
  closeOnBackdrop = true,
  hideCloseButton = false,
  style,
  ...props
}) {
  const theme = useTheme();

  const maxWidthBySize = {
    sm: "420px",
    md: "560px",
    lg: "760px",
    xl: "980px"
  };

  const maxWidth = maxWidthBySize[size] || maxWidthBySize.md;

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!open) return null;

  function handleBackdropClick() {
    if (closeOnBackdrop) {
      onClose?.();
    }
  }

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
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: theme.colors.surface,
          borderRadius: theme.borderRadius.md,
          boxShadow: theme.elevation[3],
          padding: theme.layout.padding,
          width: "100%",
          maxWidth,
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamily,
          ...style
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: theme.spacing.sm }}>
          {title ? <h3 style={{ margin: 0, marginBottom: theme.spacing.md, color: theme.colors.text, fontSize: theme.typography.cardTitle.fontSize, fontWeight: theme.typography.cardTitle.fontWeight }}>{title}</h3> : null}
          {!hideCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar modal"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "1.1rem",
                lineHeight: 1,
                color: theme.colors.muted,
                borderRadius: theme.borderRadius.sm,
                padding: theme.spacing.xs,
                transition: "transform 200ms ease, box-shadow 200ms ease, color 200ms ease"
              }}
            >
              x
            </button>
          ) : null}
        </div>
        <div>{children}</div>
        {footer ? <div style={{ marginTop: theme.spacing.md }}>{footer}</div> : null}
      </div>
    </div>
  );
}
