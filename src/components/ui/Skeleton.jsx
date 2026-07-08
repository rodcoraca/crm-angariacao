import { useMemo } from "react";
import { useTheme } from "../../theme/ThemeContext";

export default function Skeleton({
  width = "100%",
  height,
  radius,
  lines = 1,
  gap,
  animated = true,
  style
}) {
  const theme = useTheme();

  const lineStyle = useMemo(
    () => ({
      width,
      height: height || theme.layout.padding,
      borderRadius: radius || theme.borderRadius.md,
      background: `linear-gradient(90deg, ${theme.colors.surfaceSoft} 0%, ${theme.colors.light} 50%, ${theme.colors.surfaceSoft} 100%)`,
      backgroundSize: "220% 100%",
      animation: animated ? "osflow-skeleton-shimmer 1.2s ease infinite" : "none",
      transition: "opacity 200ms ease"
    }),
    [animated, height, radius, theme, width]
  );

  return (
    <div style={{ display: "grid", gap: gap || theme.spacing.xs, ...style }} aria-hidden="true">
      {Array.from({ length: Math.max(1, lines) }).map((_, index) => (
        <span key={index} style={lineStyle} />
      ))}

      <style>{`@keyframes osflow-skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -20% 0; } }`}</style>
    </div>
  );
}
