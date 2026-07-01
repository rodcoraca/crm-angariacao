import { useState } from "react";
import logo from "../assets/logo.png";
import { temAcesso } from "../utils/usuarios";

export default function Sidebar({ setView, logout, collapsed, onToggle, perfil, onSelectLogsView }) {
  const [menuLeadsAberto, setMenuLeadsAberto] = useState(true);
  const [menuEstoqueAberto, setMenuEstoqueAberto] = useState(true);
  const [menuGestaoAberto, setMenuGestaoAberto] = useState(true);
  const [menuLogsAberto, setMenuLogsAberto] = useState(true);

  const podeVer = (modulo) => temAcesso(perfil, modulo);

  return (
    <div style={{ ...sidebar, ...(collapsed ? collapsedSidebar : {}) }}>
      <div style={topRow}>
        <div style={logoBox}>
          {collapsed ? (
            <img src={logo} alt="ERA CRM" style={logoMiniImg} />
          ) : (
            <div style={logoExpanded}>
              <img src={logo} alt="OSFlow" style={logoImg} />
            </div>
          )}
        </div>
        <button style={toggleBtn} onClick={onToggle}>
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <div style={menuList}>
        {podeVer('fluxo') ? (
          <button style={collapsed ? { ...btnMenu, ...btnMenuCollapsed } : btnMenu} onClick={() => setView("fluxo")}>
            {collapsed ? "F" : "Fluxo"}
          </button>
        ) : null}

        {podeVer('dashboard') || podeVer('quente') || podeVer('morno') || podeVer('frio') ? (
          <>
            <button style={collapsed ? { ...btnMenu, ...btnMenuCollapsed } : btnMenu} onClick={() => setMenuLeadsAberto((v) => !v)}>
              {collapsed ? "L" : `Leads ${menuLeadsAberto ? "▾" : "▸"}`}
            </button>
            {menuLeadsAberto && !collapsed && (
              <div style={subMenu}>
                {podeVer('dashboard') ? <button style={subBtn} onClick={() => setView("dashboard")}>Todos</button> : null}
                {podeVer('quente') ? <button style={subBtn} onClick={() => setView("quente")}>Quentes</button> : null}
                {podeVer('morno') ? <button style={subBtn} onClick={() => setView("morno")}>Mornos</button> : null}
                {podeVer('frio') ? <button style={subBtn} onClick={() => setView("frio")}>Frios</button> : null}
              </div>
            )}
          </>
        ) : null}

        {podeVer('estoque_np') ? (
          <>
            <button style={collapsed ? { ...btnMenu, ...btnMenuCollapsed } : btnMenu} onClick={() => setMenuEstoqueAberto((v) => !v)}>
              {collapsed ? "E" : `Estoque ${menuEstoqueAberto ? "▾" : "▸"}`}
            </button>
            {menuEstoqueAberto && !collapsed && (
              <div style={subMenu}>
                <button style={subBtn} onClick={() => setView("estoque_np")}>Cadastrados</button>
              </div>
            )}
          </>
        ) : null}

        {podeVer('mensagens') ? (
          <button style={collapsed ? { ...btnMenu, ...btnMenuCollapsed } : btnMenu} onClick={() => setView("mensagens")}>
            {collapsed ? "M" : "Mensagens"}
          </button>
        ) : null}

        {(podeVer('usuarios') || podeVer('logs')) && (
          <>
            <button style={collapsed ? { ...btnMenu, ...btnMenuCollapsed } : btnMenu} onClick={() => setMenuGestaoAberto((v) => !v)}>
              {collapsed ? "G" : `Gestão ${menuGestaoAberto ? "▾" : "▸"}`}
            </button>
            {menuGestaoAberto && !collapsed && (
              <div style={subMenu}>
                {podeVer('usuarios') ? <button style={subBtn} onClick={() => setView("usuarios")}>Utilizadores</button> : null}
                {podeVer('logs') ? (
                  <>
                    <button style={subBtn} onClick={() => setMenuLogsAberto((v) => !v)}>
                      Logs {menuLogsAberto ? "▾" : "▸"}
                    </button>
                    {menuLogsAberto ? (
                      <div style={nestedSubMenu}>
                        <button style={nestedSubBtn} onClick={() => onSelectLogsView?.('geral')}>Lista de logs</button>
                        <button style={nestedSubBtn} onClick={() => onSelectLogsView?.('utilizadores')}>Por utilizador</button>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      <button style={collapsed ? { ...btnLogout, ...btnLogoutCollapsed } : btnLogout} onClick={logout}>
        {collapsed ? "S" : "Sair"}
      </button>
    </div>
  );
}

const sidebar = {
  width: "230px",
  background: "white",
  borderRight: "1px solid #e2e8f0",
  padding: "16px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  transition: "width 0.2s ease",
  minHeight: "100vh",
};

const collapsedSidebar = {
  width: "72px",
};

const topRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "8px",
};

const logoBox = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "56px",
  minWidth: "56px",
  flex: 1,
};

const logoExpanded = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
};

const logoImg = {
  width: "84px",
  height: "84px",
  objectFit: "contain",
};

const logoMiniImg = {
  width: "44px",
  height: "44px",
  objectFit: "contain",
};

const logoText = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#1e293b",
  letterSpacing: "0.02em",
};

const logoMini = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#1e293b",
};

const toggleBtn = {
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  borderRadius: "6px",
  cursor: "pointer",
  padding: "6px 8px",
};

const menuList = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const btnMenu = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  padding: "10px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "left",
  fontWeight: "600",
  color: "#0f172a",
  boxShadow: "0 1px 2px rgba(15,23,42,0.05)",
};

const btnMenuCollapsed = {
  textAlign: "center",
  padding: "10px 6px",
  fontSize: "14px",
  fontWeight: "700",
};

const subMenu = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  paddingLeft: "10px",
};

const subBtn = {
  border: "none",
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  color: "#475569",
  padding: "4px 0",
  fontSize: "13px",
};

const nestedSubMenu = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  paddingLeft: "8px",
};

const nestedSubBtn = {
  border: "none",
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  color: "#64748b",
  padding: "2px 0",
  fontSize: "12px",
};

const btnLogout = {
  marginTop: "auto",
  background: "#ef4444",
  color: "white",
  border: "none",
  padding: "10px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "700",
};

const btnLogoutCollapsed = {
  padding: "10px 6px",
  fontSize: "14px",
  fontWeight: "700",
};
