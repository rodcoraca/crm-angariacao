import { useId, useRef, useState } from "react";
import { useTheme } from "../../theme/ThemeContext";

export default function Tooltip({
  content,
  children,
  placement = "top",
  disabled = false,
  maxWidth,
  delay = 120,
  style,
  tooltipStyle
}) {
  const theme = useTheme();
  const tooltipId = useId();
  const triggerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  if (!content) return children || null;

  const computePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const tooltipWidth = Math.min(Number(maxWidth) || 420, window.innerWidth - 24);
    const tooltipHeight = 120;

    let top = rect.top;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    if (placement === "bottom") {
      top = rect.bottom + 10;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
    } else if (placement === "left") {
      left = rect.left - tooltipWidth - 10;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
    } else if (placement === "right") {
      left = rect.right + 10;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
    } else {
      top = rect.top - tooltipHeight - 10;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
    }

    if (left < 12) left = 12;
    if (left + tooltipWidth > window.innerWidth - 12) left = window.innerWidth - tooltipWidth - 12;
    if (top < 12) top = 12;
    if (top + tooltipHeight > window.innerHeight - 12) top = window.innerHeight - tooltipHeight - 12;

    setPosition({ top, left });
  };

  const show = () => {
    if (disabled) return;
    computePosition();
    window.setTimeout(() => setVisible(true), delay);
  };

  const hide = () => setVisible(false);

  return (
    <span
      ref={triggerRef}
      style={{ position: "relative", display: "inline-flex", zIndex: 2147483647, isolation: "isolate", ...style }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={visible ? tooltipId : undefined}
    >
      {children}

      {visible && !disabled ? (
        <span
          id={tooltipId}
          role="tooltip"
          style={{
            position: "fixed",
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 2147483647,
            display: "block",
            minWidth: "260px",
            maxWidth: maxWidth || "520px",
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            borderRadius: theme.borderRadius.sm,
            background: theme.colors.text,
            color: theme.colors.textLight,
            fontSize: theme.typography.caption.fontSize,
            fontWeight: theme.typography.caption.fontWeight,
            lineHeight: theme.typography.caption.lineHeight,
            boxShadow: theme.elevation[2],
            pointerEvents: "none",
            whiteSpace: "normal",
            wordBreak: "break-word",
            ...tooltipStyle
          }}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
