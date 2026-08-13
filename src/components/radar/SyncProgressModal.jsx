import { useEffect, useRef, useState } from "react";
import Modal from "../ui/Modal";
import { useTheme } from "../../theme/ThemeContext";
import {
  providerSyncEngine,
  SyncState
} from "../../shared/provider-engine/sync/ProviderSyncEngine";
import { runImovirtualSync } from "../../providers/services/providers/providerSyncRunner";

const WORKFLOW_STEPS = [
  { state: SyncState.PREPARING,  label: "Preparação" },
  { state: SyncState.CONNECTING, label: "Ligação" },
  { state: SyncState.FETCHING,   label: "Obtenção de oportunidades" },
  { state: SyncState.PROCESSING, label: "Processamento" },
  { state: SyncState.SAVING,     label: "Gravação" },
  { state: SyncState.FINALIZING, label: "Finalização" },
];

const STATE_INDEX = {
  [SyncState.IDLE]:       -1,
  [SyncState.PREPARING]:   0,
  [SyncState.CONNECTING]:  1,
  [SyncState.FETCHING]:    2,
  [SyncState.PROCESSING]:  3,
  [SyncState.SAVING]:      4,
  [SyncState.FINALIZING]:  5,
  [SyncState.COMPLETED]:   6,
  [SyncState.FAILED]:     -1,
};

const STATE_LABEL = {
  [SyncState.PREPARING]:  "A preparar...",
  [SyncState.CONNECTING]: "A estabelecer ligação...",
  [SyncState.FETCHING]:   "A obter oportunidades...",
  [SyncState.PROCESSING]: "A processar resultados...",
  [SyncState.SAVING]:     "A guardar...",
  [SyncState.FINALIZING]: "A finalizar...",
  [SyncState.COMPLETED]:  "Sincronização concluída",
  [SyncState.FAILED]:     "Não foi possível concluir a sincronização.",
};

const ACTIVE_STATES = new Set([
  SyncState.PREPARING,
  SyncState.CONNECTING,
  SyncState.FETCHING,
  SyncState.PROCESSING,
  SyncState.SAVING,
  SyncState.FINALIZING,
]);

function buildQueryLabel(config) {
  if (!config) return null;
  const provLabel = config.provider
    ? config.provider.charAt(0).toUpperCase() + config.provider.slice(1)
    : "";
  const districtList = Array.isArray(config.districts) && config.districts.length > 0
    ? config.districts.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")
    : null;
  const priv = config.includePrivateOwners !== false;
  const prof = config.includeProfessionalOwners !== false;
  const owners = (priv && prof)
    ? "Particulares e Profissionais"
    : priv ? "Particulares"
    : prof ? "Profissionais"
    : null;
  return [provLabel, districtList, owners].filter(Boolean).join(" › ");
}

function formatElapsed(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function SyncProgressModal() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [event, setEvent] = useState(null);
  const [syncConfig, setSyncConfig] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastActiveIndex, setLastActiveIndex] = useState(-1);
  const timerRef = useRef(null);

  const currentState = event?.state ?? SyncState.IDLE;
  const providerName = event?.provider ?? "";
  const isBlocking   = ACTIVE_STATES.has(currentState);
  const isCompleted  = currentState === SyncState.COMPLETED;
  const isFailed     = currentState === SyncState.FAILED;

  useEffect(() => {
    if (!isBlocking) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isBlocking]);

  useEffect(() => {
    const unsubscribe = providerSyncEngine.subscribe((incoming) => {
      setEvent(incoming);

      if (incoming.state === SyncState.IDLE) {
        setOpen(false);
        setLastActiveIndex(-1);
        return;
      }

      if (incoming.state === SyncState.PREPARING && incoming.detail) {
        setSyncConfig(incoming.detail);
        setLastActiveIndex(-1);
      }

      setOpen(true);

      const incomingIndex = STATE_INDEX[incoming.state] ?? -1;
      if (ACTIVE_STATES.has(incoming.state)) {
        setLastActiveIndex(incomingIndex);
      }
    });

    return () => {
      unsubscribe();
      clearInterval(timerRef.current);
    };
  }, []);

  // Elapsed time counter — ticks live until finishedAt is set
  const startedAt  = event?.startedAt  ?? null;
  const finishedAt = event?.finishedAt ?? null;

  useEffect(() => {
    clearInterval(timerRef.current);

    if (!startedAt) {
      setElapsedSeconds(0);
      return;
    }

    if (finishedAt) {
      const diff = Math.round(
        (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000
      );
      setElapsedSeconds(Math.max(0, diff));
      return;
    }

    const startMs = new Date(startedAt).getTime();
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startMs) / 1000));
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [startedAt, finishedAt]);

  const currentIndex = STATE_INDEX[currentState] ?? -1;
  const workflowIndex = isFailed ? lastActiveIndex : currentIndex;
  const stateLabel   = STATE_LABEL[currentState] ?? "";

  const queryLabel = buildQueryLabel(syncConfig) || providerName;

  async function handleRetry() {
    if (!syncConfig) return;
    try {
      await runImovirtualSync(syncConfig);
    } catch (_) {
      // estado FAILED emitido pelo runner
    }
  }

  const processed = event?.processed ?? 0;
  const total     = event?.total     ?? 0;
  const imported  = event?.imported  ?? 0;
  const updated   = event?.updated   ?? 0;
  const ignored   = event?.ignored   ?? 0;
  const errors    = event?.errors    ?? 0;

  const hasDashboardData = processed > 0 || total > 0;
  const shouldShowProgress = isBlocking || isCompleted || (isFailed && total > 0);
  const progressPct = total > 0
    ? (isCompleted ? 100 : Math.min(100, Math.round((processed / total) * 100)))
    : isCompleted
      ? 100
      : null;

  function handleClose() {
    if (isBlocking) return;
    setOpen(false);
    providerSyncEngine.reset();
  }

  const dividerStyle = {
    borderTop: `1px solid ${theme.colors.border}`,
    margin: `${theme.spacing.sm} 0`
  };

  const statRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: `4px 0`,
    fontSize: theme.typography?.body?.fontSize ?? "0.9rem",
    color: theme.colors.text
  };

  const statLabelStyle = { color: theme.colors.muted };

  return (
    <>
      <style>{`
        @keyframes osflow-sync-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes osflow-sync-progress {
          0%   { left: -40%; width: 40%; }
          50%  { left: 20%; width: 60%; }
          100% { left: 100%; width: 40%; }
        }
      `}</style>
      <Modal
        open={open}
        title="Sincronização de Oportunidades"
        size="sm"
        closeOnBackdrop={false}
        hideCloseButton={isBlocking}
        onClose={isBlocking ? undefined : handleClose}
        style={{
          width: "min(100%, 420px)",
          maxWidth: "min(90vw, 420px)"
        }}
      >
        {/* Resumo da consulta */}
        {queryLabel ? (
          <p style={{
            margin: 0,
            marginBottom: theme.spacing.sm,
            fontSize: theme.typography?.caption?.fontSize ?? "0.8rem",
            color: theme.colors.muted
          }}>
            {queryLabel}
          </p>
        ) : null}

        {isBlocking ? (
          <div style={{
            display: "grid",
            gap: theme.spacing.xs,
            marginBottom: theme.spacing.sm,
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            borderRadius: theme.borderRadius.md,
            background: theme.colors.surfaceSoft,
            border: `1px solid ${theme.colors.statusInfoBorder}`,
            overflowWrap: "anywhere",
            wordBreak: "break-word"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: theme.spacing.xs,
              minWidth: 0
            }}>
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: "14px",
                  height: "14px",
                  borderRadius: theme.borderRadius.full,
                  border: `2px solid ${theme.colors.statusInfoBorder}`,
                  borderTopColor: theme.colors.statusInfoText,
                  animation: "osflow-sync-spin 0.8s linear infinite",
                  flexShrink: 0
                }}
              />
              <p style={{
                margin: 0,
                fontSize: theme.typography?.body?.fontSize ?? "0.95rem",
                fontWeight: 600,
                color: theme.colors.text,
                minWidth: 0,
                overflowWrap: "anywhere"
              }}>
                A atualização está em andamento.
              </p>
            </div>
            <p style={{
              margin: 0,
              fontSize: theme.typography?.caption?.fontSize ?? "0.8rem",
              color: theme.colors.muted,
              lineHeight: 1.5,
              overflowWrap: "anywhere",
              wordBreak: "break-word"
            }}>
              Pode demorar devido ao número de oportunidades encontradas. Não feche a janela/sistema nem atualize a página durante o processo.
            </p>
          </div>
        ) : (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: theme.spacing.xs,
            marginBottom: theme.spacing.sm
          }}>
            {isBlocking ? (
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: "14px",
                  height: "14px",
                  borderRadius: theme.borderRadius.full,
                  border: `2px solid ${theme.colors.statusInfoBorder}`,
                  borderTopColor: theme.colors.statusInfoText,
                  animation: "osflow-sync-spin 0.8s linear infinite",
                  flexShrink: 0
                }}
              />
            ) : null}
            <p style={{
              margin: 0,
              fontSize: theme.typography?.body?.fontSize ?? "0.95rem",
              fontWeight: isCompleted ? 600 : 400,
              color: isCompleted
                ? theme.colors.success
                : isFailed
                  ? theme.colors.danger
                  : theme.colors.text
            }}>
              {isCompleted ? "✓ " : ""}{stateLabel}
            </p>
          </div>
        )}

        <hr style={dividerStyle} />

        {/* Dashboard: remains mounted and is revealed when useful data arrives. */}
        <div style={{
          opacity: hasDashboardData ? 1 : 0,
          transition: "opacity 280ms ease",
          marginBottom: theme.spacing.sm
        }}>
          <div style={{ marginBottom: theme.spacing.xs }}>
            <div style={statRowStyle}>
              <span style={statLabelStyle}>Analisados</span>
              <span>{processed}</span>
            </div>
            <div style={statRowStyle}>
              <span style={statLabelStyle}>Novos</span>
              <span style={{ color: imported > 0 ? theme.colors.success : theme.colors.text }}>
                {imported}
              </span>
            </div>
            <div style={statRowStyle}>
              <span style={statLabelStyle}>Actualizados</span>
              <span>{updated}</span>
            </div>
            <div style={statRowStyle}>
              <span style={statLabelStyle}>Ignorados</span>
              <span>{ignored}</span>
            </div>
            <div style={statRowStyle}>
              <span style={statLabelStyle}>Erros</span>
              <span style={{ color: errors > 0 ? theme.colors.danger : theme.colors.text }}>
                {errors}
              </span>
            </div>
          </div>

          <hr style={dividerStyle} />

          <div style={statRowStyle}>
            <span style={statLabelStyle}>Tempo decorrido</span>
            <span style={{
              fontVariantNumeric: "tabular-nums",
              fontFamily: "monospace",
              fontSize: theme.typography?.body?.fontSize ?? "0.9rem"
            }}>
              {formatElapsed(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Progress bar — indeterminate or deterministic */}
        {shouldShowProgress ? (
          <div style={{
            position: "relative",
            overflow: "hidden",
            height: "4px",
            borderRadius: theme.borderRadius.full,
            background: theme.colors.border,
            marginBottom: theme.spacing.md
          }}>
            <div style={{
              position: "absolute",
              top: 0,
              left: progressPct !== null ? 0 : undefined,
              height: "100%",
              width: progressPct !== null ? `${progressPct}%` : undefined,
              borderRadius: theme.borderRadius.full,
              background: theme.colors.primary,
              animation: progressPct === null
                ? "osflow-sync-progress 1.6s ease-in-out infinite"
                : "none",
              transition: "left 400ms ease, width 400ms ease"
            }} />
          </div>
        ) : null}

        {/* Workflow steps */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.xs,
          marginBottom: theme.spacing.md
        }}>
          {WORKFLOW_STEPS.map((step, index) => {
            const isDone    = isCompleted || workflowIndex > index;
            const isCurrent = !isCompleted && !isFailed && workflowIndex === index;

            return (
              <div
                key={step.state}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.xs,
                  padding: `6px ${theme.spacing.sm}`,
                  borderRadius: theme.borderRadius.sm,
                  background: isCurrent
                    ? theme.colors.statusInfoSurface
                    : "transparent",
                  border: isCurrent
                    ? `1px solid ${theme.colors.statusInfoBorder}`
                    : "1px solid transparent",
                  transition: "background 200ms ease"
                }}
              >
                {isDone ? (
                  <span style={{
                    width: "18px",
                    textAlign: "center",
                    color: theme.colors.success,
                    fontWeight: 600,
                    fontSize: "0.9rem"
                  }}>✓</span>
                ) : isCurrent ? (
                  <span style={{
                    display: "inline-block",
                    width: "14px",
                    height: "14px",
                    borderRadius: theme.borderRadius.full,
                    border: `2px solid ${theme.colors.statusInfoBorder}`,
                    borderTopColor: theme.colors.statusInfoText,
                    animation: "osflow-sync-spin 0.8s linear infinite",
                    flexShrink: 0
                  }} />
                ) : (
                  <span style={{
                    width: "18px",
                    textAlign: "center",
                    color: theme.colors.border,
                    fontSize: "0.85rem"
                  }}>○</span>
                )}

                <span style={{
                  fontSize: theme.typography?.body?.fontSize ?? "0.9rem",
                  color: isDone
                    ? theme.colors.text
                    : isCurrent
                      ? theme.colors.statusInfoText
                      : theme.colors.muted,
                  fontWeight: isCurrent ? 600 : 400
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Failed: close button */}
        {(isCompleted || isFailed) && !isBlocking ? (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: theme.spacing.sm }}>
            {isFailed ? (
              <button
                type="button"
                onClick={handleRetry}
                style={{
                  padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                  borderRadius: theme.borderRadius.sm,
                  border: "none",
                  background: theme.colors.success,
                  color: "#fff",
                  fontSize: theme.typography?.body?.fontSize ?? "0.9rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 600
                }}
              >
                Tentar novamente
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                borderRadius: theme.borderRadius.sm,
                border: "none",
                background: theme.colors.danger,
                color: "#fff",
                fontSize: theme.typography?.body?.fontSize ?? "0.9rem",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 600
              }}
            >
              Fechar
            </button>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
