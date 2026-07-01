export default function SidebarItem({ children, onClick, collapsed, style, collapsedStyle, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...(collapsed && collapsedStyle ? collapsedStyle : {}),
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
}
