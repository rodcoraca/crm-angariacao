import { useTheme } from "../../theme/ThemeContext";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

export default function Blockers({ blockers = [], onResolve }) {
  const theme = useTheme();

  const impactVariant = {
    alto: "danger",
    medio: "warning",
    baixo: "neutral"
  };

  if (!blockers.length) {
    return (
      <Card style={{ display: "grid", gap: theme.spacing.md }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: theme.colors.text }}>Bloqueios</h3>
          <Badge variant="success">Sem bloqueios</Badge>
        </div>

        <p style={{ margin: 0, color: theme.colors.muted }}>
          Nao existem bloqueios ativos neste momento.
        </p>

        <div>
          <Button variant="ghost" disabled>
            Nenhuma acao necessaria
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ display: "grid", gap: theme.spacing.md }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, color: theme.colors.text }}>Bloqueios</h3>
        <Badge variant="danger">{blockers.length} ativos</Badge>
      </div>

      <div style={{ display: "grid", gap: theme.spacing.sm }}>
        {blockers.map((blocker, index) => {
          const impactKey = (blocker.impacto || "").toLowerCase();
          const variant = impactVariant[impactKey] || "warning";

          return (
            <Card key={`${blocker.titulo}-${index}`} style={{ display: "grid", gap: theme.spacing.sm, padding: theme.spacing.md }}>
              <div style={{ display: "flex", gap: theme.spacing.xs, flexWrap: "wrap" }}>
                <Badge variant={variant}>{blocker.impacto || "Impacto"}</Badge>
                <Badge variant="primary">{blocker.categoria || "Categoria"}</Badge>
              </div>

              <div style={{ display: "grid", gap: theme.spacing.xs }}>
                <strong style={{ color: theme.colors.text }}>{blocker.titulo}</strong>
                <p style={{ margin: 0, color: theme.colors.muted }}>{blocker.descricao}</p>
              </div>

              <div>
                <Button variant="ghost" onClick={() => onResolve?.(blocker)}>
                  Ver detalhe
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
