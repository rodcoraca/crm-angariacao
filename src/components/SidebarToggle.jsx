export default function SidebarToggle({ collapsed, onToggle, toggleBtn }) {
  return (
    <button style={toggleBtn} onClick={onToggle}>
      {collapsed ? "»" : "«"}
    </button>
  );
}
