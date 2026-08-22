import { useEffect, useRef, useState } from "react";
import Modal from "../ui/Modal";
import { useTheme } from "../../theme/ThemeContext";
import {
  providerSyncEngine,
  SyncState
} from "../../shared/provider-engine/sync/ProviderSyncEngine";
import { runImovirtualSync } from "../../providers/services/providers/providerSyncRunner";
import imovirtualLogo from "../../assets/imovirtual.jpg";
import custojustoLogo from "../../assets/custojusto.jpg";

const PROVIDER_LOGOS = {
  imovirtual: imovirtualLogo,
  custojusto: custojustoLogo
};

const WORKFLOW_STEPS = [
  { state: SyncState.PREPARING,  label: "Preparação" },
  { state: SyncState.CONNECTING, label: "Ligação" },
  { state: SyncState.FETCHING,   label: "Obtenção" },
  { state: SyncState.PROCESSING, label: "Tratamento" },
  { state: SyncState.FINALIZING, label: "Conclusão" },
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

function getProviderLogo(providerValue) {
  const normalized = String(providerValue || "").trim().toLowerCase();
  return PROVIDER_LOGOS[normalized] || null;
}

function getProviderLabel(providerValue) {
  const normalized = String(providerValue || "").trim().toLowerCase();
  if (normalized.includes("imovirtual")) return "Imovirtual";
  if (normalized.includes("custojusto")) return "CustoJusto";
  const text = String(providerValue || "").trim();
  return text || "Provider";
}

function buildHumanStatusMessage({ providerName, districtCount, ownerLabel, processed }) {
  const label = getProviderLabel(providerName);

  if (processed > 0) {
    return `Encontrámos ${processed.toLocaleString("pt-PT")} oportunidades até agora.`;
  }

  if (Array.isArray(districtCount) && districtCount.length > 0) {
    return `Estamos a verificar anúncios em ${districtCount.length} distritos.`;
  }

  if (ownerLabel) {
    return `Estamos a procurar anúncios de ${ownerLabel.toLowerCase()}.`;
  }

  return `Estamos a procurar novas oportunidades no ${label}.`;
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

  const processed = event?.processed ?? 0;
  const total     = event?.total     ?? 0;
  const imported  = event?.imported  ?? 0;
  const updated   = event?.updated   ?? 0;
  const ignored   = event?.ignored   ?? 0;
  const errors    = event?.errors    ?? 0;

  const queryLabel = buildQueryLabel(syncConfig) || providerName;
  const providerLogo = getProviderLogo(providerName);
  const districtCount = Array.isArray(syncConfig?.districts) ? syncConfig.districts : [];
  const ownerLabel = syncConfig?.includePrivateOwners !== false && syncConfig?.includeProfessionalOwners !== false
    ? "particulares e profissionais"
    : syncConfig?.includePrivateOwners !== false
      ? "particulares"
      : syncConfig?.includeProfessionalOwners !== false
        ? "profissionais"
        : "anunciantes";

  const humanStatusMessage = buildHumanStatusMessage({
    providerName,
    districtCount,
    ownerLabel,
    processed
  });

  function getStepStatus(index) {
    if (isFailed && index === Math.max(0, lastActiveIndex)) {
      return "error";
    }
    if (isCompleted && index >= WORKFLOW_STEPS.length - 1) {
      return "done";
    }
    if (index < workflowIndex) {
      return "done";
    }
    if (index === workflowIndex && !isFailed && !isCompleted) {
      return "active";
    }
    return "pending";
  }

  const progressText = total > 0
    ? `${processed.toLocaleString("pt-PT")} / ${total.toLocaleString("pt-PT")}`
    : null;

  const progressPercent = total > 0
    ? Math.min(100, Math.max(0, Math.round((processed / total) * 100)))
    : null;

  async function handleRetry() {
    if (!syncConfig) return;
    try {
      await runImovirtualSync(syncConfig);
    } catch (_) {
      // estado FAILED emitido pelo runner
    }
  }

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
        @keyframes osflow-sync-pulse {
          0%   { opacity: 0.4; }
          50%  { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
      <Modal
        open={open}
        title="Sincronização de Oportunidades"
        size="xl"
        closeOnBackdrop={false}
        hideCloseButton={isBlocking}
        onClose={isBlocking ? undefined : handleClose}
        style={{
          width: "min(100%, 1180px)",
          maxWidth: "min(96vw, 1180px)",
          height: "min(82vh, 760px)",
          maxHeight: "calc(100vh - 32px)",
          padding: theme.layout?.padding ?? theme.spacing.md,
          overflow: "hidden"
        }}
      >
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(250px, 0.9fr) minmax(0, 1.5fr)",
          gap: theme.spacing.md,
          alignItems: "stretch",
          minHeight: 0,
          height: "100%"
        }}>
          <div style={{
            display: "grid",
            gap: theme.spacing.sm,
            minWidth: 0
          }}>
            <div style={{
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              background: theme.colors.surfaceSoft,
              border: `1px solid ${theme.colors.border}`,
              boxShadow: theme.shadows?.sm || "0 1px 3px rgba(15,23,42,0.08)"
            }}>
              <div style={{
                fontSize: theme.typography?.caption?.fontSize ?? "0.72rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: theme.colors.muted,
                marginBottom: theme.spacing.xs
              }}>
                Provider em execução
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: theme.spacing.sm,
                flexWrap: "wrap"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.xs,
                  minWidth: 0
                }}>
                  {providerLogo ? (
                    <img
                      src={providerLogo}
                      alt={getProviderLabel(providerName)}
                      style={{
                        width: "32px",
                        height: "32px",
                        objectFit: "cover",
                        borderRadius: theme.borderRadius.sm,
                        border: `1px solid ${theme.colors.border}`,
                        background: theme.colors.surface
                      }}
                    />
                  ) : (
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "32px",
                      height: "32px",
                      borderRadius: theme.borderRadius.sm,
                      background: theme.colors.surface,
                      border: `1px solid ${theme.colors.border}`,
                      color: theme.colors.primary,
                      fontWeight: 700
                    }}>
                      {String(providerName || "P").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span style={{
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    color: theme.colors.text,
                    overflowWrap: "anywhere"
                  }}>
                    {getProviderLabel(providerName)}
                  </span>
                </div>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: isFailed ? theme.colors.danger : theme.colors.primary,
                  background: isFailed ? theme.colors.dangerSoft || "rgba(220,38,38,0.08)" : theme.colors.statusInfoSurface,
                  border: `1px solid ${isFailed ? theme.colors.dangerBorder || "rgba(220,38,38,0.22)" : theme.colors.statusInfoBorder}`,
                  borderRadius: theme.borderRadius.full,
                  padding: "5px 10px"
                }}>
                  {isBlocking ? "Em execução" : isCompleted ? "Concluído" : isFailed ? "Erro" : "Preparado"}
                </span>
              </div>
            </div>

            <div style={{
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              background: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`
            }}>
              <div style={{
                fontSize: theme.typography?.caption?.fontSize ?? "0.72rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: theme.colors.muted,
                marginBottom: theme.spacing.xs
              }}>
                Estado atual
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.xs,
                minWidth: 0,
                marginBottom: theme.spacing.xs
              }}>
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: "12px",
                    height: "12px",
                    borderRadius: theme.borderRadius.full,
                    background: isFailed ? theme.colors.danger : isCompleted ? theme.colors.success : theme.colors.primary,
                    animation: isBlocking ? "osflow-sync-pulse 1.2s ease-in-out infinite" : "none",
                    flexShrink: 0
                  }}
                />
                <span style={{
                  color: theme.colors.text,
                  fontWeight: 600,
                  overflowWrap: "anywhere"
                }}>
                  {stateLabel}
                </span>
              </div>
              <div style={{
                color: theme.colors.muted,
                fontSize: theme.typography?.body?.fontSize ?? "0.9rem",
                lineHeight: 1.5
              }}>
                A sincronização está em andamento.
              </div>
            </div>

            <div style={{
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              background: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`
            }}>
              <div style={{
                fontSize: theme.typography?.caption?.fontSize ?? "0.72rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: theme.colors.muted,
                marginBottom: theme.spacing.xs
              }}>
                Estado do processo
              </div>
              <div style={{
                fontSize: "0.98rem",
                color: theme.colors.text,
                lineHeight: 1.5
              }}>
                {humanStatusMessage}
              </div>
            </div>

            <div style={{
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              background: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`
            }}>
              <div style={{
                display: "grid",
                gap: theme.spacing.xs,
                color: theme.colors.text
              }}>
                <div style={statRowStyle}>
                  <span style={statLabelStyle}>Início</span>
                  <span>{startedAt ? new Date(startedAt).toLocaleString() : "—"}</span>
                </div>
                <div style={statRowStyle}>
                  <span style={statLabelStyle}>Duração</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", fontFamily: "monospace" }}>
                    {formatElapsed(elapsedSeconds)}
                  </span>
                </div>
                <div style={statRowStyle}>
                  <span style={statLabelStyle}>Ações</span>
                  <span>{processed.toLocaleString("pt-PT")}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            display: "grid",
            gap: theme.spacing.sm,
            minWidth: 0
          }}>
            <div style={{
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              background: theme.colors.surfaceSoft,
              border: `1px solid ${theme.colors.border}`
            }}>
              <div style={{
                fontSize: theme.typography?.caption?.fontSize ?? "0.72rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: theme.colors.muted,
                marginBottom: theme.spacing.sm
              }}>
                Progresso da sincronização
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gap: theme.spacing.sm,
                marginBottom: theme.spacing.md
              }}>
                {WORKFLOW_STEPS.map((step, index) => {
                  const status = getStepStatus(index);
                  const done = status === "done";
                  const active = status === "active";
                  const error = status === "error";

                  return (
                    <div key={step.state} style={{
                      position: "relative",
                      minWidth: 0,
                      textAlign: "left"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: theme.spacing.xs,
                        marginBottom: theme.spacing.xs
                      }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "24px",
                          height: "24px",
                          borderRadius: theme.borderRadius.full,
                          background: error
                            ? theme.colors.danger
                            : done
                              ? theme.colors.success
                              : active
                                ? theme.colors.statusInfoSurface
                                : theme.colors.surface,
                          border: `1px solid ${error ? theme.colors.dangerBorder || "rgba(220,38,38,0.22)" : done ? theme.colors.success : active ? theme.colors.statusInfoBorder : theme.colors.border}`,
                          color: error || done ? "#fff" : active ? theme.colors.statusInfoText : theme.colors.muted,
                          fontSize: "0.72rem",
                          fontWeight: 700
                        }}>
                          {error ? "✕" : done ? "✓" : active ? "●" : "○"}
                        </span>
                      </div>
                      <div style={{
                        fontSize: "0.72rem",
                        color: active ? theme.colors.statusInfoText : done ? theme.colors.text : theme.colors.muted,
                        lineHeight: 1.3,
                        overflowWrap: "anywhere"
                      }}>
                        {step.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: theme.spacing.xs,
                marginBottom: theme.spacing.xs
              }}>
                <strong style={{ color: theme.colors.text, fontSize: "0.92rem" }}>
                  Oportunidades processadas
                </strong>
                <span style={{ color: theme.colors.muted, fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>
                  {progressText || "Em curso"}
                </span>
              </div>

              {progressPercent !== null ? (
                <>
                  <div style={{
                    position: "relative",
                    width: "100%",
                    height: "12px",
                    borderRadius: theme.borderRadius.full,
                    background: theme.colors.surface,
                    border: `1px solid ${theme.colors.border}`,
                    overflow: "hidden"
                  }}>
                    <div style={{
                      width: `${progressPercent}%`,
                      height: "100%",
                      borderRadius: theme.borderRadius.full,
                      background: isFailed ? theme.colors.danger : theme.colors.success,
                      transition: "width 220ms ease"
                    }} />
                  </div>
                  <div style={{
                    marginTop: theme.spacing.xs,
                    color: theme.colors.muted,
                    fontSize: "0.75rem",
                    fontVariantNumeric: "tabular-nums"
                  }}>
                    {progressPercent}%
                  </div>
                </>
              ) : (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.xs,
                  color: theme.colors.muted,
                  fontSize: "0.82rem"
                }}>
                  <span aria-hidden="true" style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: theme.colors.primary,
                    animation: "osflow-sync-pulse 1.2s ease-in-out infinite"
                  }} />
                  Atividade em curso
                </div>
              )}
            </div>

            <div style={{
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              background: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              minHeight: "240px",
              display: "grid",
              gridTemplateRows: "auto 1fr"
            }}>
              <div style={{
                fontSize: theme.typography?.caption?.fontSize ?? "0.72rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: theme.colors.muted,
                marginBottom: theme.spacing.xs
              }}>
                Atividade em tempo real
              </div>

              <div style={{
                display: "grid",
                gap: theme.spacing.xs,
                maxHeight: "220px",
                overflowY: "auto",
                paddingRight: theme.spacing.xs
              }}>
                {[
                  { label: "Sincronização iniciada", value: startedAt ? new Date(startedAt).toLocaleTimeString() : "—", tone: "neutral" },
                  { label: `Provider em execução: ${providerName || "Provider"}`, value: stateLabel, tone: "info" },
                  { label: "Oportunidades processadas", value: `${processed.toLocaleString("pt-PT")}`, tone: "success" },
                  { label: "Importadas", value: `${imported.toLocaleString("pt-PT")}`, tone: "success" },
                  { label: "Duplicadas", value: `${ignored.toLocaleString("pt-PT")}`, tone: "warning" },
                  { label: "Erros", value: `${errors.toLocaleString("pt-PT")}`, tone: "danger" }
                ].map((entry) => (
                  <div key={entry.label} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: theme.spacing.xs,
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: theme.borderRadius.sm,
                    background: theme.colors.surfaceSoft,
                    border: `1px solid ${theme.colors.border}`
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: theme.spacing.xs,
                      minWidth: 0
                    }}>
                      <span style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: entry.tone === "danger" ? theme.colors.danger : entry.tone === "success" ? theme.colors.success : entry.tone === "warning" ? theme.colors.warning || "#f59e0b" : theme.colors.primary,
                        flexShrink: 0
                      }} />
                      <span style={{
                        color: theme.colors.text,
                        fontSize: "0.82rem",
                        overflowWrap: "anywhere"
                      }}>
                        {entry.label}
                      </span>
                    </div>
                    <span style={{
                      color: theme.colors.muted,
                      fontSize: "0.74rem",
                      fontVariantNumeric: "tabular-nums"
                    }}>
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {(isCompleted || isFailed) && !isBlocking ? (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
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
