import { useTheme } from "../../../theme/ThemeContext";

export default function PageLayout({ children, style, maxWidth = "100%", centered = false }) {
  const theme = useTheme();

  return (
    <div
      style={{
        display: "grid",
        gap: theme.layout.gap,
        width: "100%",
        maxWidth,
        margin: centered ? "0 auto" : undefined,
        ...style
      }}
    >
      {children}
    </div>
  );
}
