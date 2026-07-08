import { useTheme } from "./theme/ThemeContext";
import Button from "./components/Button";
import Card from "./components/Card";

export default function SidebarMenu({
  logo,
  onSelectView,
  menuLeadsAberto,
  toggleLeads,
  menuEstoqueAberto,
  toggleEstoque,
  logout
}) {
  const theme = useTheme();

  const menuButton = {
    width: "100%",
    justifyContent: "flex-start",
    display: "inline-flex",
    gap: theme.spacing.xs,
    textAlign: "left",
    fontWeight: theme.typography.cardTitle.fontWeight,
    fontSize: theme.typography.body.fontSize
  };

  const submenuButton = {
    width: "100%",
    justifyContent: "flex-start",
    display: "inline-flex",
    gap: theme.spacing.xs,
    textAlign: "left",
    fontSize: theme.typography.caption.fontSize
  };

  const logoutButton = {
    marginTop: theme.spacing.md,
    width: "100%"
  };

  const sectionLabel = {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: theme.typography.cardTitle.fontWeight,
    color: theme.colors.muted,
    marginBottom: theme.spacing.xs
  };

  const submenu = {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.xs,
    marginLeft: theme.spacing.sm
  };

  return (
    <Card style={{ padding: theme.spacing.lg, display: "flex", flexDirection: "column", gap: theme.spacing.md, background: theme.colors.surfaceSoft, border: `1px solid ${theme.colors.border}` }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: theme.spacing.sm,
          background: theme.colors.surface,
          borderRadius: theme.borderRadius.md,
          boxShadow: theme.elevation[1]
        }}
      >
        <img
          src={logo}
          alt="NEXA"
          style={{ height: "90px", width: "auto", objectFit: "contain" }}
        />
      </div>

      <div>
        <div style={sectionLabel}>Navegação</div>
        <div style={{ display: "grid", gap: theme.spacing.xs }}>
          <Button color="light" style={menuButton} onClick={() => onSelectView("fluxo")}>Fluxo</Button>
          <Button color="light" style={menuButton} onClick={toggleLeads}>
            Leads {menuLeadsAberto ? "▼" : "▶"}
          </Button>
          {menuLeadsAberto && (
            <div style={submenu}>
              <Button color="light" style={submenuButton} onClick={() => onSelectView("dashboard")}>Todos</Button>
              <Button color="light" style={submenuButton} onClick={() => onSelectView("quente")}>Quentes</Button>
              <Button color="light" style={submenuButton} onClick={() => onSelectView("morno")}>Mornos</Button>
              <Button color="light" style={submenuButton} onClick={() => onSelectView("frio")}>Frios</Button>
            </div>
          )}

          <Button color="light" style={menuButton} onClick={toggleEstoque}>
            Estoque {menuEstoqueAberto ? "▼" : "▶"}
          </Button>
          {menuEstoqueAberto && (
            <div style={submenu}>
              <Button color="light" style={submenuButton} onClick={() => onSelectView("estoque_np")}>Não Publicitado</Button>
            </div>
          )}

          <Button color="light" style={menuButton} onClick={() => onSelectView("documentos")}>Documentos</Button>
          <Button color="light" style={menuButton} onClick={() => onSelectView("mensagens")}>Mensagens</Button>
        </div>
      </div>

      <Button color="danger" style={logoutButton} onClick={logout}>Sair</Button>
    </Card>
  );
}
