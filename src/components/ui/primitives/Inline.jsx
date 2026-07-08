import { useTheme } from "../../../theme/ThemeContext";

export default function Inline({ children, gap = "sm", wrap = true, align = "center", justify = "flex-start", style }) {
  const theme = useTheme();
  const resolvedGap = theme.spacing[gap] || gap || theme.layout.gap;

  return (
    <div
      style={{
        display: "flex",
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? "wrap" : "nowrap",
        gap: resolvedGap,
        ...style
      }}
    >
      {children}
    </div>
  );
}
