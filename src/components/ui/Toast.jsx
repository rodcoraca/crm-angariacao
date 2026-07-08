import { useMemo } from "react";
import { useTheme } from "../../theme/ThemeContext";

export default function Toast({
  message,
  variant = "neutral",
  onClose,
  style
}) {
  const theme = useTheme();

  const palette = useMemo(() => {
    const variants = {
      success: {
        background: theme.colors.statusSuccessSurface,
        border: theme.colors.statusSuccessBorder,
        text: theme.colors.statusSuccessText
      },
      danger: {
        background: theme.colors.statusDangerSurface,
        border: theme.colors.statusDangerBorder,
        text: theme.colors.statusDangerText
      },
      warning: {
        background: theme.colors.statusWarningSurface,
        border: theme.colors.statusWarningBorder,
        text: theme.colors.statusWarningText
      },
      neutral: {
        background: theme.colors.surface,
        border: theme.colors.border,
        text: theme.colors.text
      }
    };

    return variants[variant] || variants.neutral;
  }, [theme, variant]);

  const iconByVariant = {
    success: "✓",
    danger: "!",
    warning: "!",
    neutral: "i"
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        borderRadius: theme.borderRadius.md,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.text,
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        boxShadow: theme.elevation[1],
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body.fontSize,
        fontWeight: theme.typography.body.fontWeight,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: theme.spacing.sm,
        transition: "transform 200ms ease, box-shadow 200ms ease, opacity 200ms ease",
        ...style
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: theme.spacing.xs }}>
        <strong style={{ fontSize: theme.typography.badge.fontSize, fontWeight: theme.typography.badge.fontWeight }} aria-hidden="true">
          {iconByVariant[variant] || iconByVariant.neutral}
        </strong>
        <span>{message}</span>
      </span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar notificacao"
          style={{
            border: "none",
            background: "transparent",
            color: palette.text,
            cursor: "pointer",
            fontSize: theme.typography.cardTitle.fontSize,
            lineHeight: 1,
            padding: 0,
            borderRadius: theme.borderRadius.sm,
            transition: "transform 200ms ease, box-shadow 200ms ease"
          }}
        >
          x
        </button>
      ) : null}
    </div>
  );
}
