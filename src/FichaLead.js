import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "./theme/ThemeContext";
import { formatarNomeApresentacao } from "./utils/nomes";
import Button from "./components/Button";
import Input from "./Input";
import { LEAD_STATUSES } from "./modules/leads/statusCatalog";
import Card from "./components/Card";
import { useFichaLead } from "./modules/leads/hooks";
import { calcularDataLembrete } from "./modules/leads/services";
import { carregarHistoricoLembretesLead } from "./modules/leads/services/leadsService";
import { criarLeadLembrete } from "./modules/leads/services/leadLembretesService";
import { badgeTipoFicha, labelTipoLead } from "./modules/leads/viewmodels";
import { criarOpcoesDropdownOrigemLead } from "./modules/leads/utils";
import { resolveRadarLeadImportInfo } from "./modules/radar/contracts/radarLeadMetadata";
import { useDirtyForm, useNavigationGuard } from "./shared/navigation";

export default function FichaLead({ leadId, user, voltar }) {
  const theme = useTheme();
  const {
    lead,
    form,
    agentes,
    loading,
    salvando,
    transferindo,
    telefoneErro,
    atualizar,
    handleTelefoneChange,
    nomeAgente,
    salvar,
    transferirAgente,
    canManageLead,
    canTransferLead
  } = useFichaLead({ leadId, user });
  const { isDirty, isDirtyNow, markDirty, markClean, reset } = useDirtyForm();
  const [isEditing, setIsEditing] = useState(true);
  const [historicoLembretes, setHistoricoLembretes] = useState([]);
  const isEditingRef = useRef(true);

  useEffect(() => {
    let active = true;

    async function carregarHistorico() {
      if (!leadId || !user) {
        setHistoricoLembretes([]);
        return;
      }

      const { data, error } = await carregarHistoricoLembretesLead({ leadId, user });
      if (!active) return;

      if (error) {
        setHistoricoLembretes([]);
        return;
      }

      setHistoricoLembretes(data || []);
    }

    carregarHistorico();
    return () => { active = false; };
  }, [leadId, user]);

  const finishEditing = useCallback(() => {
    isEditingRef.current = false;
    setIsEditing(false);
  }, []);

  const isEditingNow = useCallback(() => isEditingRef.current, []);

  async function guardarFicha({ voltarAposGuardar = true } = {}) {
    const result = await salvar();
    if (!result?.error) {
      markClean();
      finishEditing();
      if (voltarAposGuardar) voltar?.();
    }
    return result;
  }

  useNavigationGuard({
    isDirty,
    isDirtyNow,
    isEditing,
    isEditingNow,
    onSave: () => guardarFicha({ voltarAposGuardar: false }),
    onDiscard: () => {
      reset();
      finishEditing();
    },
    onCancelEditing: finishEditing,
    markClean
  });

  function atualizarCampo(campo, valor) {
    markDirty();
    atualizar(campo, valor);
  }

  function atualizarTelefone(valor) {
    markDirty();
    handleTelefoneChange(valor);
  }

  function alterarLembreteAtivo(ativo) {
    if (!ativo) {
      atualizarCampo("lembrete_ativo", false);
      atualizarCampo("data_lembrete", "");
      atualizarCampo("hora_lembrete", "");
      return;
    }

    const opcao = "0";
    atualizarCampo("lembrete_ativo", true);
    atualizarCampo("lembrete_opcao", opcao);
    atualizarCampo("data_lembrete", calcularDataLembrete(opcao, ""));
    atualizarCampo("hora_lembrete", "");
  }

  function alterarOpcaoLembrete(opcao) {
    atualizarCampo("lembrete_opcao", opcao);
    if (opcao !== "personalizada") {
      atualizarCampo("data_lembrete", calcularDataLembrete(opcao, ""));
    }
  }

  async function criarLembrete() {
    const hoje = new Date();
    const dataHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    const proximaData = form.data_lembrete || dataHoje;
    const proximaHora = form.hora_lembrete || "09:00";

    atualizarCampo("lembrete_ativo", true);
    atualizarCampo("lembrete_opcao", "personalizada");
    atualizarCampo("data_lembrete", proximaData);
    atualizarCampo("hora_lembrete", proximaHora);

    const result = await guardarFicha({ voltarAposGuardar: false });
    if (result?.error) {
      return result;
    }

    return result;
  }

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
      fontWeight: 600,
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
    radarBox: {
      background: theme.colors.surfaceSoft,
      color: theme.colors.text,
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.lg,
      display: "grid",
      gap: theme.spacing.xs
    },
    radarTitle: {
      margin: 0,
      fontSize: "0.95rem",
      fontWeight: 700,
      color: theme.colors.text
    },
    radarLine: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "0.9rem"
    },
    radarLink: {
      width: "fit-content",
      marginTop: theme.spacing.xs
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
      marginTop: theme.spacing.xs,
      resize: "vertical"
    },
    fullWidthField: {
      width: "100%",
      marginTop: theme.spacing.lg
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
    visitSection: {
      display: "grid",
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      borderTop: `1px solid ${theme.colors.border}`
    },
    visitTitle: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "1rem"
    },
    reminderSection: {
      display: "grid",
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      borderTop: `1px solid ${theme.colors.border}`
    },
    reminderHistorySection: {
      display: "grid",
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      borderTop: `1px solid ${theme.colors.border}`
    },
    reminderHistoryList: {
      display: "grid",
      gap: theme.spacing.sm
    },
    reminderHistoryItem: {
      display: "grid",
      gap: "6px",
      padding: theme.spacing.sm,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.md,
      background: theme.colors.surfaceSoft
    },
    reminderHistoryMeta: {
      display: "flex",
      gap: theme.spacing.sm,
      flexWrap: "wrap",
      color: theme.colors.muted,
      fontSize: "0.82rem"
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
  const podeGerir = canManageLead(lead);
  const podeTransferir = canTransferLead(lead);
  const radarImportInfo = resolveRadarLeadImportInfo(lead, form);
  const origemOptions = criarOpcoesDropdownOrigemLead({
    includeSemOrigem: true,
    includeOutro: false,
    currentValue: form.origem
  });

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
        <strong>Agente responsável:</strong> {nomeAgente(lead.agente_id)}
      </div>

      {radarImportInfo ? (
        <div style={styles.radarBox}>
          <h3 style={styles.radarTitle}>Origem da Lead</h3>
          <p style={styles.radarLine}><strong>Provider:</strong> {radarImportInfo.provider || "-"}</p>
          <p style={styles.radarLine}><strong>ID externo:</strong> {radarImportInfo.externalId || "-"}</p>
          <p style={styles.radarLine}><strong>Importada em:</strong> {formatarData(radarImportInfo.importedAt)}</p>
          <p style={styles.radarLine}><strong>Estado:</strong> {radarImportInfo.status}</p>
          {radarImportInfo.url ? (
            <Button
              color="light"
              style={styles.radarLink}
              onClick={() => window.open(radarImportInfo.url, "_blank", "noopener,noreferrer")}
            >
              Ver anúncio original ↗
            </Button>
          ) : null}
        </div>
      ) : null}

      <div style={styles.grid}>
        <label style={styles.label}>
          Telefone
          <Input
            value={form.telefone}
            onChange={(e) => atualizarTelefone(e.target.value)}
            maxLength={12}
            inputMode="numeric"
            disabled={!podeGerir}
          />
          {telefoneErro && <div style={styles.errorText}>{telefoneErro}</div>}
        </label>

        <label style={styles.label}>
          Nome
          <Input value={form.nome} onChange={(e) => atualizarCampo("nome", e.target.value)} disabled={!podeGerir} />
        </label>

        <label style={styles.label}>
          Tipo
          <select style={styles.select} value={form.tipo} onChange={(e) => atualizarCampo("tipo", e.target.value)} disabled={!podeGerir}>
            <option value="quente">Quente</option>
            <option value="morno">Morno</option>
            <option value="frio">Frio</option>
          </select>
        </label>

        <label style={styles.label}>
          Origem
          <select style={styles.select} value={form.origem} onChange={(e) => atualizarCampo("origem", e.target.value)} disabled={!podeGerir}>
            {origemOptions.map((option) => (
              <option key={option.value || "sem-origem"} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label style={styles.label}>
          Status
          <select style={styles.select} value={form.status} onChange={(e) => atualizarCampo("status", e.target.value)} disabled={!podeGerir}>
            {LEAD_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </label>

        {podeTransferir ? (
          <label style={styles.label}>
            Agente responsável
            <select
              style={styles.select}
              value={form.agente_id}
              onChange={(e) => transferirAgente(e.target.value)}
              disabled={transferindo}
            >
              <option value="">Sem agente</option>
              {agentes.map((agente) => (
                <option key={agente.id} value={agente.id}>
                  {formatarNomeApresentacao(agente.nome)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label style={styles.label}>
            Agente responsável
            <Input value={nomeAgente(lead.agente_id) || "Sem agente"} disabled />
          </label>
        )}
      </div>

      {form.status === "agendamento" ? (
        <section style={styles.visitSection} aria-labelledby="dados-visita-title">
          <h3 id="dados-visita-title" style={styles.visitTitle}>Dados da visita</h3>
          <div style={styles.grid}>
            <label style={styles.label}>
              Data
              <Input type="date" value={form.data_visita} onChange={(e) => atualizarCampo("data_visita", e.target.value)} disabled={!podeGerir} />
            </label>

            <label style={styles.label}>
              Hora
              <Input type="time" value={form.hora_visita} onChange={(e) => atualizarCampo("hora_visita", e.target.value)} disabled={!podeGerir} />
            </label>

            <label style={styles.label}>
              Local
              <Input value={form.local_visita} onChange={(e) => atualizarCampo("local_visita", e.target.value)} disabled={!podeGerir} />
            </label>

            <label style={styles.label}>
              Estado da visita
              <select style={styles.select} value={form.status_visita} onChange={(e) => atualizarCampo("status_visita", e.target.value)} disabled={!podeGerir}>
                <option value="">Por confirmar</option>
                <option value="confirmada">Confirmada</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </label>
          </div>
        </section>
      ) : null}

      <section style={styles.reminderSection} aria-labelledby="lembrete-title">
        <h3 id="lembrete-title" style={styles.visitTitle}>Lembrete</h3>

        {!form.lembrete_ativo ? (
          <Button
            type="button"
            color="light"
            onClick={criarLembrete}
            disabled={!podeGerir}
            style={{ width: "fit-content" }}
          >
            + Criar Lembrete
          </Button>
        ) : (
          <div style={styles.grid}>
            <label style={styles.label}>
              Lembrar em:
              <select style={styles.select} value={form.lembrete_opcao} onChange={(e) => alterarOpcaoLembrete(e.target.value)} disabled={!podeGerir}>
                <option value="0">Hoje</option>
                <option value="1">Amanhã</option>
                <option value="3">3 dias</option>
                <option value="7">7 dias</option>
                <option value="14">14 dias</option>
                <option value="personalizada">Data personalizada</option>
              </select>
            </label>

            {form.lembrete_opcao === "personalizada" ? (
              <label style={styles.label}>
                Data do lembrete
                <Input type="date" value={form.data_lembrete} onChange={(e) => atualizarCampo("data_lembrete", e.target.value)} disabled={!podeGerir} />
              </label>
            ) : null}

            <label style={styles.label}>
              Hora do lembrete
              <Input type="time" value={form.hora_lembrete} onChange={(e) => atualizarCampo("hora_lembrete", e.target.value)} disabled={!podeGerir} />
            </label>
          </div>
        )}
      </section>

      <section style={styles.reminderHistorySection} aria-labelledby="historico-lembretes-title">
        <h3 id="historico-lembretes-title" style={styles.visitTitle}>Histórico de Lembretes</h3>

        {historicoLembretes.length === 0 ? (
          <div style={{ color: theme.colors.muted }}>Sem lembretes concluídos.</div>
        ) : (
          <div style={styles.reminderHistoryList}>
            {historicoLembretes.map((lembrete) => (
              <div key={lembrete.id} style={styles.reminderHistoryItem}>
                <strong>
                  {formatarDataLeitura(lembrete.data_lembrete)} {lembrete.hora_lembrete ? `• ${formatarHoraLeitura(lembrete.hora_lembrete)}` : ""}
                </strong>
                <div style={styles.reminderHistoryMeta}>
                  <span>Estado: {lembrete.estado}</span>
                  <span>Criação: {formatarDataHoraLeitura(lembrete.criado_at)}</span>
                  <span>Conclusão: {formatarDataHoraLeitura(lembrete.concluido_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <label style={{ ...styles.label, ...styles.fullWidthField }}>
        Histórico
        <Input as="textarea" rows={6} style={styles.textarea} value={form.observacoes} onChange={(e) => atualizarCampo("observacoes", e.target.value)} disabled={!podeGerir} />
      </label>

      <div style={styles.footer}>
        <Button color="light" style={styles.btnSecondary} onClick={voltar}>Cancelar</Button>
        <Button color="success" style={styles.btnPrimary} onClick={() => guardarFicha()} disabled={salvando || !podeGerir}>
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

function formatarDataLeitura(data) {
  if (!data) return "-";
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-PT");
}

function formatarHoraLeitura(hora) {
  if (!hora) return "-";
  return hora.slice(0, 5);
}

function formatarDataHoraLeitura(dataHora) {
  if (!dataHora) return "-";
  return new Date(dataHora).toLocaleString("pt-PT");
}

