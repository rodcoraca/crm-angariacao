import { useTheme } from "../../../theme/ThemeContext";

export default function Stack({ children, gap = "sm", style }) {
  const theme = useTheme();
  const resolvedGap = theme.spacing[gap] || gap || theme.layout.gap;

  return <div style={{ display: "grid", gap: resolvedGap, ...style }}>{children}</div>;
}
