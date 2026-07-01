import { useTheme } from "../../theme/ThemeContext";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

export default function ActionCenter({ actions = [], loading = false, onAction }) {
  const theme = useTheme();

  const priorityConfig = {
    alta: { label: "Alta", variant: "danger", buttonVariant: "danger" },
    media: { label: "Media", variant: "warning", buttonVariant: "secondary" },
    baixa: { label: "Baixa", variant: "neutral", buttonVariant: "ghost" }
  };

  const typeConfig = {
    lead: { label: "Lead", variant: "primary" },
    imovel: { label: "Imovel", variant: "success" },
    agenda: { label: "Agenda", variant: "warning" },
    documento: { label: "Documento", variant: "neutral" }
  };

  if (loading) {
    return (
      <Card style={{ display: "grid", gap: theme.spacing.md }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: theme.colors.text }}>Centro de Acoes</h3>
          <Badge variant="primary">Carregando</Badge>
        </div>

        {[1, 2, 3].map((item) => (
          <Card
            key={item}
            style={{
              display: "grid",
              gap: theme.spacing.sm,
              borderStyle: "dashed",
              boxShadow: "none"
            }}
          >
            <div style={{ height: "16px", width: "45%", background: theme.colors.surfaceSoft, borderRadius: theme.borderRadius.sm }} />
            <div style={{ height: "12px", width: "100%", background: theme.colors.surfaceSoft, borderRadius: theme.borderRadius.sm }} />
            <div style={{ height: "12px", width: "70%", background: theme.colors.surfaceSoft, borderRadius: theme.borderRadius.sm }} />
          </Card>
        ))}
      </Card>
    );
  }

  if (!actions.length) {
    return (
      <Card style={{ display: "grid", gap: theme.spacing.md }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: theme.colors.text }}>Centro de Acoes</h3>
          <Badge variant="neutral">Sem itens</Badge>
        </div>

        <p style={{ margin: 0, color: theme.colors.muted }}>
          Nao existem acoes pendentes para este momento.
        </p>

        <div>
          <Button variant="ghost" disabled>
            Sem acoes disponiveis
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ display: "grid", gap: theme.spacing.md }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, color: theme.colors.text }}>Centro de Acoes</h3>
        <Badge variant="primary">{actions.length} prioridades</Badge>
      </div>

      <div style={{ display: "grid", gap: theme.spacing.sm }}>
        {actions.map((action) => {
          const priority = priorityConfig[action.prioridade] || priorityConfig.media;
          const type = typeConfig[action.tipo] || typeConfig.lead;

          return (
            <Card
              key={action.id}
              style={{
                display: "grid",
                gap: theme.spacing.sm,
                padding: theme.spacing.md
              }}
            >
              <div style={{ display: "flex", gap: theme.spacing.xs, flexWrap: "wrap" }}>
                <Badge variant={priority.variant}>{priority.label}</Badge>
                <Badge variant={type.variant}>{type.label}</Badge>
              </div>

              <div style={{ display: "grid", gap: theme.spacing.xs }}>
                <strong style={{ color: theme.colors.text }}>{action.titulo}</strong>
                <p style={{ margin: 0, color: theme.colors.muted }}>{action.descricao}</p>
              </div>

              <div>
                <Button
                  variant={priority.buttonVariant}
                  onClick={() => onAction?.(action)}
                >
                  {action.acao || "Executar"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
