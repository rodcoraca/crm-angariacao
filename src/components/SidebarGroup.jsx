import SidebarItem from "./SidebarItem";

export default function SidebarGroup({ collapsed, open, title, onToggle, collapsedLabel, expandedLabel, children, buttonStyle, collapsedButtonStyle, subMenuStyle }) {
  return (
    <>
      <SidebarItem
        collapsed={collapsed}
        onClick={onToggle}
        style={buttonStyle}
        collapsedStyle={collapsedButtonStyle}
      >
        {collapsed ? collapsedLabel : `${title} ${open ? "▾" : "▸"}`}
      </SidebarItem>
      {open && !collapsed && <div style={subMenuStyle}>{children}</div>}
    </>
  );
}
