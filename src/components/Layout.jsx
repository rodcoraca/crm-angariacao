import { useTheme } from "../theme/ThemeContext";
import Header from "./Header";
import Footer from "./Footer";
import { wrapperStyle, sidebarStyle, collapsedSidebarStyle, mainAreaStyle, contentStyle } from "./Layout.styles";

export default function Layout({ children, header, sidebar, footer, collapsed }) {
  const theme = useTheme();

  return (
    <div style={{ ...wrapperStyle, background: theme.colors.background }}>
      {sidebar && (
        <aside
          style={{
            ...sidebarStyle,
            background: theme.colors.surface,
            borderRight: `1px solid ${theme.colors.border}`,
            ...(collapsed ? collapsedSidebarStyle : {})
          }}
        >
          {sidebar}
        </aside>
      )}

      <div style={mainAreaStyle}>
        {header && <Header>{header}</Header>}
        <main style={{ ...contentStyle, background: theme.colors.background }}>{children}</main>
        {footer && <Footer>{footer}</Footer>}
      </div>
    </div>
  );
}
