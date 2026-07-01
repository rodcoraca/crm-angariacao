export default function Layout({ children, header, sidebar, collapsed }) {
  return (
    <div style={wrapper}>
      {sidebar && <aside style={{ ...sidebarStyle, ...(collapsed ? collapsedSidebarStyle : {}) }}>{sidebar}</aside>}

      <div style={mainArea}>
        {header && <header style={topbar}>{header}</header>}
        <main style={content}>{children}</main>
      </div>
    </div>
  );
}

const wrapper = {
  display: "flex",
  minHeight: "100vh",
  background: "#f8fafc",
};

const sidebarStyle = {
  flexShrink: 0,
  background: "white",
  borderRight: "1px solid #e2e8f0",
  minHeight: "100vh",
  boxSizing: "border-box",
};

const collapsedSidebarStyle = {
  width: "72px",
};

const mainArea = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
};

const topbar = {
  height: "70px",
  background: "#1e293b",
  color: "white",
  display: "flex",
  alignItems: "center",
  padding: "0 20px",
  boxSizing: "border-box",
  boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
};

const content = {
  flex: 1,
  padding: "20px",
  background: "#f1f5f9",
  overflowX: "auto",
};
