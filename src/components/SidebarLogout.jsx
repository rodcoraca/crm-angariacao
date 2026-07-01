export default function SidebarLogout({ collapsed, onClick, style, collapsedStyle }) {
  return (
    <button type="button" style={{ ...(collapsed ? collapsedStyle : {}), ...style }} onClick={onClick}>
      {collapsed ? "S" : "Sair"}
    </button>
  );
}
