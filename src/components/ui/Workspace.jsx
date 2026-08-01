import { useEffect } from "react";
import { useTheme } from "../../theme/ThemeContext";

export default function Workspace({
  open = false,
  title,
  subtitle,
  actions,
  children,
  footer,
  onClose,
  style,
  ...props
}) {
  const theme = useTheme();

  useEffect(() => {
  if (!open) return;

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  function handleEscape(event) {
    if (event.key === "Escape") {
      onClose?.();
    }
  }

  window.addEventListener("keydown", handleEscape);

  return () => {
    document.body.style.overflow = previousOverflow;
    window.removeEventListener("keydown", handleEscape);
  };
}, [open, onClose]);

  if (!open) return null;

  return (
    <div
      {...props}
      onClick={() => onClose?.()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(16, 34, 45, 0.45)",
        zIndex: 1100,
        padding: theme.spacing.lg,
        display: "flex"
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          height: "100%",
          background: theme.colors.surface,
          borderRadius: theme.borderRadius.md,
          boxShadow: theme.elevation[3],
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamily,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          ...style
        }}
      >
        <header
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: theme.spacing.md,
                padding: theme.layout.padding,
                borderBottom: `1px solid ${theme.colors.border}`
            }}
            >
            <div style={{ flex: 1 }}>
                <h2
                style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 600
                }}
                >
                {title}
                </h2>

                {subtitle && (
                <div
                    style={{
                    marginTop: 4,
                    color: theme.colors.muted,
                    fontSize: 13
                    }}
                >
                    {subtitle}
                </div>
                )}
            </div>

            {actions && (
                <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: theme.spacing.sm
                }}
                >
                {actions}
                </div>
            )}

            <button
            type="button"
            aria-label="Fechar Workspace"
            onClick={onClose}
            style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: theme.colors.muted,
                fontSize: 20,
                lineHeight: 1,
                padding: theme.spacing.xs
            }}
            >
            ✕
            </button>
        </header>

        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: theme.layout.padding
          }}
        >
          {children}
        </main>

        {footer && (
          <footer
            style={{
              borderTop: `1px solid ${theme.colors.border}`,
              padding: theme.layout.padding,
              background: theme.colors.surface
            }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}