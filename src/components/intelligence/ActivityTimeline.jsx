import { useTheme } from "../../theme/ThemeContext";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import "./ActivityTimeline.css";

const PLACEHOLDER_ITEMS = [
  {
    id: "timeline-login",
    icone: "L",
    titulo: "Login",
    descricao: "Acesso ao Cockpit Executivo registado.",
    data: "04/07/2026",
    hora: "08:12"
  },
  {
    id: "timeline-atualizacao",
    icone: "U",
    titulo: "Atualizacao",
    descricao: "Registo comercial atualizado para acompanhamento.",
    data: "04/07/2026",
    hora: "09:05"
  },
  {
    id: "timeline-nova-lead",
    icone: "N",
    titulo: "Nova Lead",
    descricao: "Nova oportunidade adicionada para triagem inicial.",
    data: "04/07/2026",
    hora: "10:26"
  },
  {
    id: "timeline-novo-imovel",
    icone: "I",
    titulo: "Novo Imovel",
    descricao: "Imovel inserido com validacao documental pendente.",
    data: "04/07/2026",
    hora: "11:41"
  },
  {
    id: "timeline-upload-documento",
    icone: "D",
    titulo: "Upload Documento",
    descricao: "Documento anexado para revisao operacional.",
    data: "04/07/2026",
    hora: "12:18"
  }
];

export default function ActivityTimeline({
  items = PLACEHOLDER_ITEMS,
  title = "Atividade cronologica",
  badge = "Placeholder",
  style,
  ...props
}) {
  const theme = useTheme();

  return (
    <Card
      {...props}
      style={{
        "--timeline-border": theme.colors.border,
        "--timeline-surface": theme.colors.surface,
        display: "grid",
        gap: theme.spacing.md,
        ...style
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm }}>
        <h3 style={{ margin: 0, color: theme.colors.text, fontSize: "1.05rem" }}>{title}</h3>
        <Badge variant="neutral">{badge}</Badge>
      </header>

      <div className="activity-timeline">
        {items.map((item) => (
          <article
            key={item.id || item.key || item.titulo || item.hora || "timeline-item"}
            className="activity-timeline__item"
          >
            <span
              aria-hidden="true"
              className="activity-timeline__icon"
              style={{
                background: `${theme.colors.primary}14`,
                color: theme.colors.primary,
                border: `1px solid ${theme.colors.primary}33`
              }}
            >
              {item.icone || "*"}
            </span>

            <div className="activity-timeline__content">
              <div className="activity-timeline__header">
                <h4 className="activity-timeline__title" style={{ color: theme.colors.text }}>
                  {item.titulo || "Atividade"}
                </h4>
                <span className="activity-timeline__time" style={{ color: theme.colors.muted }}>
                  {item.hora || "--:--"}
                </span>
              </div>

              <p className="activity-timeline__description" style={{ color: theme.colors.muted }}>
                {item.descricao || "Descricao pendente."}
              </p>

              <div className="activity-timeline__meta">
                <Badge variant="primary">{item.data || "--/--/----"}</Badge>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
