import { useTheme } from "../../../theme/ThemeContext";

export default function Grid({ children, columns = "repeat(auto-fit, minmax(220px, 1fr))", gap = "sm", style }) {
  const theme = useTheme();
  const resolvedGap = theme.spacing[gap] || gap || theme.layout.gap;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: columns,
        gap: resolvedGap,
        ...style
      }}
    >
      {children}
    </div>
  );
}
