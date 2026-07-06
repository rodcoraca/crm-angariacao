import { useTheme } from "../theme/ThemeContext";
import Button from "../components/Button";
import Input from "../Input";
import Card from "../components/Card";
import { useFluxoLead } from "../modules/leads/hooks";
import { formatarOrigemLead, obterEmojiOrigem } from "../modules/leads/utils";

export default function Fluxo({ user, onAbrirLead }) {
  const theme = useTheme();
  const {
    etapa,
    historico,
    nome,
    telefone,
    telefoneErro,
    origem,
    observacao,
    mostrarObs,
    tipoSelecionado,
    leadSelecionadoId,
    node,
    setNome,
    setObservacao,
    handleTelefoneChange,
    handleClick,
    voltar,
    salvarLead
  } = useFluxoLead({ user, onAbrirLead });

  const styles = {
    container: {
      display: "grid",
      gap: theme.spacing.lg,
      minHeight: "560px"
    },
    header: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm
    },
    title: {
      margin: 0,
      fontSize: "1.8rem",
      lineHeight: 1.1,
      color: theme.colors.text
    },
    subtitle: {
      margin: 0,
      color: theme.colors.muted,
      fontSize: "0.95rem"
    },
    infoBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: theme.spacing.xs,
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      borderRadius: theme.borderRadius.md,
      background: theme.colors.surfaceSoft,
      color: theme.colors.text,
      fontSize: "0.95rem"
    },
    stepInfo: {
      display: "grid",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      color: theme.colors.muted,
      fontSize: "0.95rem"
    },
    scriptBox: {
      background: theme.colors.light,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      whiteSpace: "pre-line",
      lineHeight: 1.7,
      color: theme.colors.text
    },
    formGrid: {
      display: "grid",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm
    },
    cardGrid: {
      display: "grid",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
    },
    optionCard: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: theme.spacing.md,
      background: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.lg,
      boxShadow: theme.shadow.sm,
      cursor: "pointer",
      transition: "transform 0.2s ease, border-color 0.2s ease"
    },
    optionEmoji: {
      fontSize: "1.8rem",
      marginBottom: theme.spacing.xs
    },
    actions: {
      display: "grid",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm
    },
    buttonFull: {
      width: "100%"
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: "0.95rem"
    },
    textarea: {
      minHeight: "100px"
    }
  };

  return (
    <Card style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{mostrarObs ? "Motivo da recusa" : node.pergunta}</h2>
          <p style={styles.subtitle}>Siga o guião para manter o processo profissional e ágil.</p>
        </div>

        {historico.length > 0 && (
          <Button color="light" style={styles.buttonFull} onClick={voltar}>
            ↩️ Voltar
          </Button>
        )}
      </div>

      {(leadSelecionadoId || tipoSelecionado) && (
        <div style={styles.stepInfo}>
          {leadSelecionadoId && <div>Lead recuperada automaticamente do histórico.</div>}
          {tipoSelecionado && <div>Tipo esperado: <strong>{tipoSelecionado}</strong></div>}
        </div>
      )}

      {origem && !mostrarObs && (
        <div style={styles.infoBadge}>
          📍 Origem: <strong>{formatarOrigemLead(origem)}</strong>
        </div>
      )}

      <div style={styles.scriptBox}>
        {mostrarObs ? "Registe o motivo da recusa antes de guardar." : node.script}
      </div>

      {etapa === "dados" && !mostrarObs && (
        <div style={styles.formGrid}>
          <Input
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => handleTelefoneChange(e.target.value)}
            maxLength={12}
            inputMode="numeric"
          />
          {telefoneErro && <div style={styles.errorText}>{telefoneErro}</div>}
          <Input
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
      )}

      {mostrarObs ? (
        <div style={styles.formGrid}>
          <Input
            as="textarea"
            style={styles.textarea}
            placeholder="Adicionar motivo da recusa..."
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
          <div style={styles.actions}>
            <Button color="light" onClick={voltar}>
              ↩️ Voltar
            </Button>
            <Button color="danger" onClick={() => salvarLead("frio")}>
              Guardar Lead
            </Button>
          </div>
        </div>
      ) : etapa === "origem" ? (
        <div style={styles.cardGrid}>
          {node.opcoes.map((op) => (
            <div
              key={op.texto}
              style={styles.optionCard}
              onClick={() => handleClick(op.next, op.origem)}
              onMouseEnter={(event) => { event.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(event) => { event.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={styles.optionEmoji}>{obterEmojiOrigem(op.origem)}</div>
              <strong>{op.texto}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.actions}>
          {node.opcoes?.map((op) => (
            <Button
              key={op.texto}
              style={styles.buttonFull}
              onClick={() => handleClick(op.next, op.origem)}
            >
              {op.texto}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}
