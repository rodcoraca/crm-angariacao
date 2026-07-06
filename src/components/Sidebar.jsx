import { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import SidebarLogo from "./SidebarLogo";
import SidebarToggle from "./SidebarToggle";
import SidebarItem from "./SidebarItem";
import SidebarGroup from "./SidebarGroup";
import SidebarLogout from "./SidebarLogout";
import { getRequiredPermission, hasPermission } from "../modules/auth/services";

export default function Sidebar({ setView, logout, collapsed, onToggle, perfil, onSelectLogsView }) {
  const theme = useTheme();
  const [activeView, setActiveView] = useState("home");
  const [menuLeadsAberto, setMenuLeadsAberto] = useState(true);
  const [menuEstoqueAberto, setMenuEstoqueAberto] = useState(true);
  const [menuGestaoAberto, setMenuGestaoAberto] = useState(true);
  const [menuLogsAberto, setMenuLogsAberto] = useState(true);
  const [menuAdministracaoAberto, setMenuAdministracaoAberto] = useState(true);
  const [menuDocumentacaoAberto, setMenuDocumentacaoAberto] = useState(true);

  const podeVerRota = (viewKey) => {
    const requiredPermission = getRequiredPermission(viewKey);
    return hasPermission(perfil, requiredPermission);
  };

  const podeVer = (permissionCode) => hasPermission(perfil, permissionCode);
  const podeVerAdministracao = [
    "admin_docs_arquitetura",
    "admin_docs_banco_dados",
    "admin_docs_roadmap",
    "admin_docs_saas",
    "admin_docs_seguranca",
    "admin_docs_changelog"
  ].some((modulo) => podeVerRota(modulo));

  function handleSelectView(view) {
    setActiveView(view);
    setView(view);
  }

  function handleSelectLogsView(modo) {
    setActiveView("logs");
    onSelectLogsView?.(modo);
  }

  function getMenuStyles(isActive) {
    const base = {
      ...btnMenu,
      background: isActive ? theme.colors.primary : theme.colors.surfaceSoft,
      border: `1px solid ${isActive ? theme.colors.focus : theme.colors.border}`,
      color: isActive ? theme.colors.textLight : theme.colors.text
    };

    return {
      style: base,
      collapsedStyle: {
        ...base,
        ...btnMenuCollapsed
      }
    };
  }

  function getSubMenuStyle(isActive, nested = false) {
    const base = nested ? nestedSubBtn : subBtn;
    return {
      ...base,
      color: isActive ? theme.colors.text : theme.colors.muted,
      background: isActive ? theme.colors.light : "transparent",
      borderRadius: theme.borderRadius.sm,
      padding: isActive ? "4px 6px" : base.padding
    };
  }

  return (
    <div style={{ ...sidebar, background: theme.colors.surface, borderRight: `1px solid ${theme.colors.border}`, ...(collapsed ? collapsedSidebar : {}) }}>
      <div style={topRow}>
        <SidebarLogo
          collapsed={collapsed}
          logoBox={logoBox}
          logoExpanded={logoExpanded}
          logoImg={logoImg}
          logoMiniImg={logoMiniImg}
        />
        <SidebarToggle
          collapsed={collapsed}
          onToggle={onToggle}
          toggleBtn={{ ...toggleBtn, background: theme.colors.surfaceSoft, border: `1px solid ${theme.colors.border}` }}
        />
      </div>

      <div style={menuList}>
        {podeVerRota("home") ? (() => {
          const menuStyles = getMenuStyles(activeView === "home");
          return (
            <SidebarItem
              collapsed={collapsed}
              onClick={() => handleSelectView("home")}
              style={menuStyles.style}
              collapsedStyle={menuStyles.collapsedStyle}
            >
              {collapsed ? "I" : "Início"}
            </SidebarItem>
          );
        })() : null}

        {podeVerRota("radar") ? (
          (() => {
            const menuStyles = getMenuStyles(activeView === "radar");
            return (
              <SidebarItem
                collapsed={collapsed}
                onClick={() => handleSelectView("radar")}
                style={menuStyles.style}
                collapsedStyle={menuStyles.collapsedStyle}
              >
                {collapsed ? "R" : "Radar"}
              </SidebarItem>
            );
          })()
        ) : null}

        {podeVerRota('fluxo') ? (
          (() => {
            const menuStyles = getMenuStyles(activeView === "fluxo");
            return (
              <SidebarItem
                collapsed={collapsed}
                onClick={() => handleSelectView("fluxo")}
                style={menuStyles.style}
                collapsedStyle={menuStyles.collapsedStyle}
              >
                {collapsed ? "F" : "Fluxo"}
              </SidebarItem>
            );
          })()
        ) : null}

        {podeVerRota('dashboard') || podeVerRota('quente') || podeVerRota('morno') || podeVerRota('frio') ? (
          <>
            {(() => {
              const isLeadsActive = ["dashboard", "quente", "morno", "frio"].includes(activeView);
              const menuStyles = getMenuStyles(isLeadsActive);
              return (
                <SidebarItem
                  collapsed={collapsed}
                  onClick={() => setMenuLeadsAberto((v) => !v)}
                  style={menuStyles.style}
                  collapsedStyle={menuStyles.collapsedStyle}
                >
                  {collapsed ? "L" : `Leads ${menuLeadsAberto ? "▾" : "▸"}`}
                </SidebarItem>
              );
            })()}
            {menuLeadsAberto && !collapsed && (
              <div style={subMenu}>
                {podeVerRota('dashboard') ? <SidebarItem style={getSubMenuStyle(activeView === "dashboard")} onClick={() => handleSelectView("dashboard")}>Todos</SidebarItem> : null}
                {podeVerRota('quente') ? <SidebarItem style={getSubMenuStyle(activeView === "quente")} onClick={() => handleSelectView("quente")}>Quentes</SidebarItem> : null}
                {podeVerRota('morno') ? <SidebarItem style={getSubMenuStyle(activeView === "morno")} onClick={() => handleSelectView("morno")}>Mornos</SidebarItem> : null}
                {podeVerRota('frio') ? <SidebarItem style={getSubMenuStyle(activeView === "frio")} onClick={() => handleSelectView("frio")}>Frios</SidebarItem> : null}
              </div>
            )}
          </>
        ) : null}

        {podeVerRota('estoque_np') ? (
          <>
            {(() => {
              const menuStyles = getMenuStyles(activeView === "estoque_np");
              return (
                <SidebarItem
                  collapsed={collapsed}
                  onClick={() => setMenuEstoqueAberto((v) => !v)}
                  style={menuStyles.style}
                  collapsedStyle={menuStyles.collapsedStyle}
                >
                  {collapsed ? "E" : `Estoque ${menuEstoqueAberto ? "▾" : "▸"}`}
                </SidebarItem>
              );
            })()}
            {menuEstoqueAberto && !collapsed && (
              <div style={subMenu}>
                <SidebarItem style={getSubMenuStyle(activeView === "estoque_np")} onClick={() => handleSelectView("estoque_np")}>Cadastrados</SidebarItem>
              </div>
            )}
          </>
        ) : null}

        {podeVerRota('mensagens') ? (
          (() => {
            const menuStyles = getMenuStyles(activeView === "mensagens");
            return (
              <SidebarItem
                collapsed={collapsed}
                onClick={() => handleSelectView("mensagens")}
                style={menuStyles.style}
                collapsedStyle={menuStyles.collapsedStyle}
              >
                {collapsed ? "M" : "Mensagens"}
              </SidebarItem>
            );
          })()
        ) : null}

        {podeVerAdministracao ? (
          <>
            {(() => {
              const isAdministracaoActive = [
                "admin_documentacao",
                "admin_docs_arquitetura",
                "admin_docs_banco_dados",
                "admin_docs_roadmap",
                "admin_docs_saas",
                "admin_docs_seguranca",
                "admin_docs_changelog"
              ].includes(activeView);
              const menuStyles = getMenuStyles(isAdministracaoActive);
              return (
                <SidebarItem
                  collapsed={collapsed}
                  onClick={() => setMenuAdministracaoAberto((v) => !v)}
                  style={menuStyles.style}
                  collapsedStyle={menuStyles.collapsedStyle}
                >
                  {collapsed ? "A" : `Administração ${menuAdministracaoAberto ? "▾" : "▸"}`}
                </SidebarItem>
              );
            })()}

            {menuAdministracaoAberto && !collapsed && (
              <div style={subMenu}>
                <SidebarItem style={getSubMenuStyle(activeView.startsWith("admin_docs_"))} onClick={() => setMenuDocumentacaoAberto((v) => !v)}>
                  Documentos {menuDocumentacaoAberto ? "▾" : "▸"}
                </SidebarItem>

                {menuDocumentacaoAberto ? (
                  <div style={nestedSubMenu}>
                    {podeVerRota("admin_docs_arquitetura") ? <SidebarItem style={getSubMenuStyle(activeView === "admin_docs_arquitetura", true)} onClick={() => handleSelectView("admin_docs_arquitetura")}>Arquitetura</SidebarItem> : null}
                    {podeVerRota("admin_docs_banco_dados") ? <SidebarItem style={getSubMenuStyle(activeView === "admin_docs_banco_dados", true)} onClick={() => handleSelectView("admin_docs_banco_dados")}>Banco de Dados</SidebarItem> : null}
                    {podeVerRota("admin_docs_roadmap") ? <SidebarItem style={getSubMenuStyle(activeView === "admin_docs_roadmap", true)} onClick={() => handleSelectView("admin_docs_roadmap")}>Roadmap</SidebarItem> : null}
                    {podeVerRota("admin_docs_saas") ? <SidebarItem style={getSubMenuStyle(activeView === "admin_docs_saas", true)} onClick={() => handleSelectView("admin_docs_saas")}>SaaS</SidebarItem> : null}
                    {podeVerRota("admin_docs_seguranca") ? <SidebarItem style={getSubMenuStyle(activeView === "admin_docs_seguranca", true)} onClick={() => handleSelectView("admin_docs_seguranca")}>Segurança</SidebarItem> : null}
                    {podeVerRota("admin_docs_changelog") ? <SidebarItem style={getSubMenuStyle(activeView === "admin_docs_changelog", true)} onClick={() => handleSelectView("admin_docs_changelog")}>Changelog</SidebarItem> : null}
                  </div>
                ) : null}
              </div>
            )}
          </>
        ) : null}

        {(podeVerRota('usuarios') || podeVerRota('logs')) && (
          <>
            {(() => {
              const isGestaoActive = ["usuarios", "logs"].includes(activeView);
              const menuStyles = getMenuStyles(isGestaoActive);
              return (
                <SidebarItem
                  collapsed={collapsed}
                  onClick={() => setMenuGestaoAberto((v) => !v)}
                  style={menuStyles.style}
                  collapsedStyle={menuStyles.collapsedStyle}
                >
                  {collapsed ? "G" : `Gestão ${menuGestaoAberto ? "▾" : "▸"}`}
                </SidebarItem>
              );
            })()}
            {menuGestaoAberto && !collapsed && (
              <div style={subMenu}>
                {podeVerRota('usuarios') ? <SidebarItem style={getSubMenuStyle(activeView === "usuarios")} onClick={() => handleSelectView("usuarios")}>Utilizadores</SidebarItem> : null}
                {podeVerRota('logs') ? (
                  <>
                    <SidebarItem style={getSubMenuStyle(activeView === "logs")} onClick={() => setMenuLogsAberto((v) => !v)}>
                      Auditoria {menuLogsAberto ? "▾" : "▸"}
                    </SidebarItem>
                    {menuLogsAberto ? (
                      <div style={nestedSubMenu}>
                        <SidebarItem style={getSubMenuStyle(activeView === "logs", true)} onClick={() => handleSelectLogsView('geral')}>Lista de auditoria</SidebarItem>
                        <SidebarItem style={getSubMenuStyle(activeView === "logs", true)} onClick={() => handleSelectLogsView('utilizadores')}>Por utilizador</SidebarItem>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      <SidebarLogout
        collapsed={collapsed}
        onClick={logout}
        style={{ ...btnLogout, background: theme.colors.danger }}
        collapsedStyle={{ ...btnLogout, ...btnLogoutCollapsed, background: theme.colors.danger }}
      />
    </div>
  );
}

const sidebar = {
  width: "230px",
  padding: "16px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  transition: "width 0.2s ease",
  minHeight: "100vh"
};

const collapsedSidebar = {
  width: "72px"
};

const topRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "8px"
};

const logoBox = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "56px",
  minWidth: "56px",
  flex: 1
};

const logoExpanded = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%"
};

const logoImg = {
  width: "84px",
  height: "84px",
  objectFit: "contain"
};

const logoMiniImg = {
  width: "44px",
  height: "44px",
  objectFit: "contain"
};

const toggleBtn = {
  borderRadius: "6px",
  cursor: "pointer",
  padding: "6px 8px"
};

const menuList = {
  display: "flex",
  flexDirection: "column",
  gap: "8px"
};

const btnMenu = {
  padding: "10px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "left",
  fontWeight: "600",
  boxShadow: "0 1px 2px rgba(15,23,42,0.05)"
};

const btnMenuCollapsed = {
  textAlign: "center",
  padding: "10px 6px",
  fontSize: "14px",
  fontWeight: "700"
};

const subMenu = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  paddingLeft: "10px"
};

const subBtn = {
  border: "none",
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  padding: "4px 0",
  fontSize: "13px"
};

const nestedSubMenu = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  paddingLeft: "8px"
};

const nestedSubBtn = {
  border: "none",
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  padding: "2px 0",
  fontSize: "12px"
};

const btnLogout = {
  marginTop: "auto",
  color: "white",
  border: "none",
  padding: "10px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "700"
};

const btnLogoutCollapsed = {
  padding: "10px 6px",
  fontSize: "14px",
  fontWeight: "700"
};
