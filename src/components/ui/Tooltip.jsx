import { useId, useState } from "react";
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
  const [visible, setVisible] = useState(false);

  if (!content) return children || null;

  const placementStyles = {
    top: { bottom: `calc(100% + ${theme.spacing.xs})`, left: "50%", transform: "translateX(-50%)" },
    bottom: { top: `calc(100% + ${theme.spacing.xs})`, left: "50%", transform: "translateX(-50%)" },
    left: { right: `calc(100% + ${theme.spacing.xs})`, top: "50%", transform: "translateY(-50%)" },
    right: { left: `calc(100% + ${theme.spacing.xs})`, top: "50%", transform: "translateY(-50%)" }
  };

  const placementStyle = placementStyles[placement] || placementStyles.top;

  const show = () => {
    if (disabled) return;
    window.setTimeout(() => setVisible(true), delay);
  };

  const hide = () => setVisible(false);

  return (
    <span
      style={{ position: "relative", display: "inline-flex", ...style }}
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
            position: "absolute",
            zIndex: 1400,
            maxWidth: maxWidth || "280px",
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            borderRadius: theme.borderRadius.sm,
            background: theme.colors.text,
            color: theme.colors.textLight,
            fontSize: theme.typography.caption.fontSize,
            fontWeight: theme.typography.caption.fontWeight,
            lineHeight: theme.typography.caption.lineHeight,
            boxShadow: theme.elevation[2],
            pointerEvents: "none",
            ...placementStyle,
            ...tooltipStyle
          }}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
