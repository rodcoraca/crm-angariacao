import logo from "../assets/logo.png";

export default function SidebarLogo({ collapsed, logoBox, logoExpanded, logoImg, logoMiniImg }) {
  return (
    <div style={logoBox}>
      {collapsed ? (
        <img src={logo} alt="OSFlow" style={logoMiniImg} />
      ) : (
        <div style={logoExpanded}>
          <img src={logo} alt="OSFlow" style={logoImg} />
        </div>
      )}
    </div>
  );
}
