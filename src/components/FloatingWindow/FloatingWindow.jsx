import { useTheme } from "../../theme/ThemeContext";
import { useFloatingWindow } from "./useFloatingWindow";
import FloatingWindowHeader from "./FloatingWindowHeader";
import FloatingWindowBody from "./FloatingWindowBody";

export default function FloatingWindow({
  id = "default",
  title,
  children,
  isOpen,
  onClose,
  defaultPosition = { x: 20, y: 80 },
  minWidth = 300,
  maxWidth = 420,
  allowDrag = true
}) {
  const theme = useTheme();
  const {
    position,
    minimized,
    isDragging,
    zIndex,
    isMobile,
    handleDragStart,
    handleFocus,
    handleMinimize
  } = useFloatingWindow({ id, defaultPosition, isOpen, onClose });

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <aside
        style={{
          position: "fixed",
          top: theme.spacing.md,
          right: theme.spacing.md,
          width: `min(${maxWidth}px, calc(100vw - 24px))`,
          maxHeight: "calc(100vh - 24px)",
          display: "flex",
          flexDirection: "column",
          background: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.shadow.lg,
          zIndex
        }}
      >
        <FloatingWindowHeader title={title} minimized={false} onMinimize={null} onClose={onClose} />
        <FloatingWindowBody>{children}</FloatingWindowBody>
      </aside>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        width: `min(${maxWidth}px, calc(100vw - 32px))`,
        minWidth: `${minWidth}px`,
        maxHeight: "calc(100vh - 32px)",
        display: "flex",
        flexDirection: "column",
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadow.lg,
        zIndex,
        userSelect: isDragging ? "none" : "auto"
      }}
      onMouseDown={handleFocus}
    >
      <FloatingWindowHeader
        title={title}
        minimized={minimized}
        onDragStart={allowDrag ? handleDragStart : null}
        onMinimize={handleMinimize}
        onClose={onClose}
      />
      {!minimized && <FloatingWindowBody>{children}</FloatingWindowBody>}
    </div>
  );
}
