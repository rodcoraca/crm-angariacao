import { useTheme } from "../../theme/ThemeContext";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import "./ActionCard.css";

export default function ActionCard({
  icone,
  titulo,
  descricao,
  prioridade = "Media",
  onAbrir,
  disabled = false,
  style,
  ...props
}) {
  const theme = useTheme();

  const prioridadeMap = {
    alta: "danger",
    media: "warning",
    baixa: "neutral"
  };

  const prioridadeKey = String(prioridade || "").toLowerCase();
  const prioridadeVariant = prioridadeMap[prioridadeKey] || "primary";
  const tone =
    prioridadeVariant === "danger"
      ? theme.colors.danger
      : prioridadeVariant === "warning"
        ? theme.colors.warning
        : prioridadeVariant === "neutral"
          ? theme.colors.muted
          : theme.colors.primary;

  return (
    <Card
      {...props}
      className={`action-card ${props.className || ""}`.trim()}
      style={{
        display: "grid",
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        boxShadow: theme.shadow.sm,
        borderColor: `${tone}40`,
        ...style
      }}
    >
      <span aria-hidden="true" className="action-card__glow" style={{ background: `${tone}1a` }} />

      <header className="action-card__header">
        <div className="action-card__title-wrap">
          <h4 className="action-card__title" style={{ color: theme.colors.text }}>{titulo || "Acao"}</h4>
          <p className="action-card__description" style={{ color: theme.colors.muted }}>
            {descricao || "Estrutura preparada para integracao futura."}
          </p>
        </div>

        <span
          aria-hidden="true"
          className="action-card__icon"
          style={{
            background: `${tone}1a`,
            border: `1px solid ${tone}33`,
            color: tone
          }}
        >
          {icone || "*"}
        </span>
      </header>

      <footer className="action-card__footer">
        <Badge variant={prioridadeVariant}>{`Prioridade: ${prioridade}`}</Badge>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onAbrir}
          aria-label={titulo ? `Abrir ${titulo}` : "Abrir acao"}
        >
          Abrir
        </Button>
      </footer>
    </Card>
  );
}
