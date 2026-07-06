import { useMemo } from "react";
import { useTheme } from "./theme/ThemeContext";
import { formatarNomeApresentacao } from "./utils/nomes";
import Button from "./components/Button";
import Input from "./Input";
import Card from "./components/Card";
import { useFichaLead } from "./modules/leads/hooks";
import { badgeTipoFicha, labelTipoLead } from "./modules/leads/viewmodels";

export default function FichaLead({ leadId, user, voltar }) {
  const theme = useTheme();
  const {
    lead,
    form,
    agentes,
    loading,
    salvando,
    telefoneErro,
    atualizar,
    handleTelefoneChange,
    nomeAgente,
    salvar
  } = useFichaLead({ leadId, user, voltar });

  const styles = useMemo(() => ({
    container: {
      position: "relative",
      background: theme.colors.surface,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      boxShadow: theme.shadow.lg,
      minHeight: "580px"
    },
    backButton: {
      position: "absolute",
      top: theme.spacing.md,
      left: theme.spacing.md,
      zIndex: 10,
      minWidth: "46px",
      borderRadius: "8px",
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)"
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      gap: theme.spacing.lg,
      alignItems: "flex-start",
      marginBottom: theme.spacing.lg
    },
    headerTitle: {
      margin: 0,
      fontSize: "1.8rem",
      lineHeight: 1.05,
      color: theme.colors.text
    },
    headerSubtitle: {
      margin: 0,
      color: theme.colors.muted,
      fontSize: "0.95rem"
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px 16px",
      borderRadius: theme.borderRadius.lg,
      fontWeight: 700,
      fontSize: "0.95rem"
    },
    infoBox: {
      background: theme.colors.surfaceSoft,
      color: theme.colors.text,
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.lg,
      fontSize: "0.95rem"
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg
    },
    label: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing.xs,
      fontSize: "0.95rem",
      color: theme.colors.muted
    },
    select: {
      borderRadius: theme.borderRadius.md,
      border: `1px solid ${theme.colors.border}`,
      padding: theme.spacing.sm,
      background: theme.colors.inputBackground,
      color: theme.colors.text,
      fontSize: theme.typography.fontSize,
      outline: "none"
    },
    textarea: {
      minHeight: "140px",
      marginTop: theme.spacing.xs
    },
    footer: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.lg
    },
    btnSecondary: {
      minWidth: "150px"
    },
    btnPrimary: {
      minWidth: "170px"
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: "13px",
      marginTop: theme.spacing.xs
    },
    loading: {
      minHeight: "280px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: theme.colors.muted,
      fontSize: "1rem"
    }
  }), [theme]);

  if (loading) return <Card style={styles.loading}>A carregar ficha...</Card>;
  if (!lead || !form) return <Card style={styles.loading}>Lead não encontrada.</Card>;

  const badgeType = badgeTipoFicha(theme, form.tipo);

  return (
    <Card style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.headerTitle}>Ficha da Lead</h2>
          <p style={styles.headerSubtitle}>Criada em {formatarData(lead.created_at)}</p>
        </div>

        <span style={{ ...styles.badge, ...badgeType }}>{labelTipoLead(form.tipo)}</span>
      </div>

      <div style={styles.infoBox}>
        <strong>Criada por:</strong> {nomeAgente(lead.agente_id)}
      </div>

      <div style={styles.grid}>
        <label style={styles.label}>
          Telefone
          <Input
            value={form.telefone}
            onChange={(e) => handleTelefoneChange(e.target.value)}
            maxLength={12}
            inputMode="numeric"
          />
          {telefoneErro && <div style={styles.errorText}>{telefoneErro}</div>}
        </label>

        <label style={styles.label}>
          Nome
          <Input value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} />
        </label>

        <label style={styles.label}>
          Tipo
          <select style={styles.select} value={form.tipo} onChange={(e) => atualizar("tipo", e.target.value)}>
            <option value="quente">Quente</option>
            <option value="morno">Morno</option>
            <option value="frio">Frio</option>
          </select>
        </label>

        <label style={styles.label}>
          Origem
          <select style={styles.select} value={form.origem} onChange={(e) => atualizar("origem", e.target.value)}>
            <option value="">Sem origem</option>
            <option value="placa">Placa na rua</option>
            <option value="indicacao">Indicação</option>
            <option value="site">Site de imóveis</option>
          </select>
        </label>

        <label style={styles.label}>
          Status
          <select style={styles.select} value={form.status} onChange={(e) => atualizar("status", e.target.value)}>
            <option value="novo">Novo</option>
            <option value="contactado">Contactado</option>
            <option value="agendado">Agendado</option>
            <option value="fechado">Fechado</option>
          </select>
        </label>

        <label style={styles.label}>
          Agente responsável
          <select style={styles.select} value={form.agente_id} onChange={(e) => atualizar("agente_id", e.target.value)}>
            <option value="">Sem agente</option>
            {agentes.map((agente) => (
              <option key={agente.id} value={agente.id}>
                {formatarNomeApresentacao(agente.nome)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label style={styles.label}>
        Observações
        <Input as="textarea" style={styles.textarea} value={form.observacoes} onChange={(e) => atualizar("observacoes", e.target.value)} />
      </label>

      <div style={styles.footer}>
        <Button color="light" style={styles.btnSecondary} onClick={voltar}>Cancelar</Button>
        <Button color="success" style={styles.btnPrimary} onClick={salvar} disabled={salvando}>
          {salvando ? "A guardar..." : "Guardar alterações"}
        </Button>
      </div>
    </Card>
  );
}

function formatarData(data) {
  if (!data) return "-";
  return new Date(data).toLocaleString("pt-PT");
}
