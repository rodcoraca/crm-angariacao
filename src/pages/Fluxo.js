import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { FloatingWindow } from "../components/FloatingWindow";
import Button from "../components/Button";
import Input from "../Input";
import Card from "../components/Card";
import { useFluxoLead } from "../modules/leads/hooks";
import { formatarOrigemLead, listarOrigensLead } from "../modules/leads/utils";
import {
  continuarCopiloto,
  criarEstadoInicialCopiloto,
  obterEtapaCopilotoPorIndice,
  processarRespostaCopiloto,
  voltarUmPassoCopiloto
} from "./fluxoGuiaAngariacaoContent";

function gerarResumo(historico) {
  if (historico.length === 0) return "";
  const n = historico.length;
  const ultima = historico[n - 1];
  return `${n} interaç${n === 1 ? "ão" : "ões"} registada${n === 1 ? "" : "s"}. Última: ${ultima.etapaLabel} — ${ultima.estadoLabel}.`;
}

function construirMemoria(state, objetivoAtual) {
  const { historico, stepIndex } = state;
  const ultima = historico.length > 0 ? historico[historico.length - 1] : null;
  return {
    resumo: gerarResumo(historico),
    objetivoAtual: objetivoAtual ?? "",
    ultimaEtapa: ultima?.etapaLabel ?? "",
    ultimoEstado: ultima?.estadoLabel ?? "",
    estrategiaAtual: ultima?.estrategia ?? "",
    progresso: { atual: stepIndex + 1, total: 7 }
  };
}

const ETAPAS_TIMELINE = [
  "Primeira abordagem",
  "Criar empatia",
  "Descobrir necessidade",
  "Quebrar objeções",
  "Agendar visita",
  "Encerrar contacto",
  "Próximo passo"
];

export default function Fluxo({ user, onAbrirLead }) {
  const theme = useTheme();
  const [guiaAberto, setGuiaAberto] = useState(false);
  const [origemSelecionada, setOrigemSelecionada] = useState("");
  const [origemOutro, setOrigemOutro] = useState("");
  const [origemErro, setOrigemErro] = useState("");
  const [historicoConversa, setHistoricoConversa] = useState([]);
  const [proximaAcao, setProximaAcao] = useState("");
  const [copilotoState, setCopilotoState] = useState(() => criarEstadoInicialCopiloto());

  const origemOptions = useMemo(() => listarOrigensLead({ includeOutro: true }), []);
  const dadosCopiloto = useMemo(
    () => obterEtapaCopilotoPorIndice(copilotoState.stepIndex),
    [copilotoState.stepIndex]
  );
  const etapaCopilotoAtual = dadosCopiloto.etapa;
  const respostaContextualAtual = useMemo(() => {
    if (copilotoState.fase !== "strategy" || !copilotoState.estadoConversa) return null;
    return processarRespostaCopiloto({
      stepIndex: copilotoState.stepIndex,
      estadoKey: copilotoState.estadoConversa,
      ultimoEstado: copilotoState.ultimoEstado,
    });
  }, [copilotoState.fase, copilotoState.estadoConversa, copilotoState.stepIndex, copilotoState.ultimoEstado]);

  const conversationMemory = useMemo(
    () => construirMemoria(copilotoState, etapaCopilotoAtual?.objetivo),
    [copilotoState, etapaCopilotoAtual]
  );

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
    salvarLead,
    guardarEContinuarDepois,
    retomarFluxoGuardado,
    existeFluxoGuardado
  } = useFluxoLead({ user, onAbrirLead });

  const totalEtapas = 7;

  const etapaAtual = useMemo(() => {
    if (mostrarObs) return 7;
    if (["lead_quente", "lead_morno", "lead_frio", "lista"].includes(etapa)) return 7;

    const mapaEtapas = {
      origem: 1,
      dados: 2,
      inicio: 3,
      objecao: 4,
      qualificacao: 5,
      fecho: 6
    };

    return mapaEtapas[etapa] || 1;
  }, [etapa, mostrarObs]);

  const percentualEtapa = Math.min(100, Math.max(0, Math.round((etapaAtual / totalEtapas) * 100)));

  function registarHistorico(acao) {
    const timestamp = new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
    setHistoricoConversa((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, acao, timestamp }]);
  }

  useEffect(() => {
    registarHistorico(`Etapa atual: ${mostrarObs ? "Motivo da recusa" : (node?.pergunta || etapa)}`);
  }, [etapa, mostrarObs, node?.pergunta]);

  const mostrarProximaAcao = useMemo(
    () => ["fecho", "lista"].includes(etapa) || mostrarObs,
    [etapa, mostrarObs]
  );

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
    progressWrap: {
      display: "grid",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs
    },
    progressLabel: {
      color: theme.colors.muted,
      fontSize: "0.82rem"
    },
    progressTrack: {
      width: "100%",
      height: "6px",
      borderRadius: "999px",
      background: theme.colors.surfaceSoft,
      overflow: "hidden"
    },
    progressFill: {
      width: `${percentualEtapa}%`,
      height: "100%",
      background: theme.colors.primary,
      borderRadius: "999px",
      transition: "width 0.2s ease"
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
    pageLayout: {
      display: "grid",
      gap: theme.spacing.md,
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      alignItems: "start"
    },
    mainColumn: {
      display: "grid",
      gap: theme.spacing.md,
      minWidth: 0
    },
    asideColumn: {
      display: "grid",
      gap: theme.spacing.sm,
      position: "sticky",
      top: theme.spacing.sm
    },
    panelCard: {
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.md,
      background: theme.colors.surfaceSoft,
      padding: theme.spacing.sm,
      display: "grid",
      gap: theme.spacing.xs
    },
    panelTitle: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "0.95rem"
    },
    panelText: {
      margin: 0,
      color: theme.colors.muted,
      fontSize: "0.85rem",
      lineHeight: 1.4
    },
    timelineList: {
      display: "grid",
      gap: theme.spacing.xs,
      maxHeight: "220px",
      overflowY: "auto",
      paddingRight: "2px"
    },
    timelineRow: {
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.sm,
      background: theme.colors.surface,
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      display: "grid",
      gap: "2px"
    },
    timelineTime: {
      color: theme.colors.muted,
      fontSize: "0.78rem"
    },
    drawerToggle: {
      width: "100%",
      justifyContent: "space-between"
    },
    quickAnswerWrap: {
      display: "flex",
      gap: theme.spacing.xs,
      flexWrap: "wrap"
    },
    quickAnswerButton: {
      border: `1px solid ${theme.colors.border}`,
      borderRadius: "999px",
      background: theme.colors.surface,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily,
      fontSize: "0.8rem",
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      cursor: "pointer"
    },
    drawerSectionCard: {
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      background: theme.colors.surfaceSoft,
      display: "grid",
      gap: theme.spacing.xs
    },
    drawerSectionTitle: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "0.96rem"
    },
    drawerSectionPrompt: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "0.84rem",
      fontWeight: 600
    },
    drawerFieldLabel: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "0.86rem",
      fontWeight: 600
    },
    drawerFieldText: {
      margin: 0,
      color: theme.colors.muted,
      fontSize: "0.85rem",
      lineHeight: 1.45
    },
    drawerQuestionList: {
      margin: 0,
      paddingLeft: "1rem",
      display: "grid",
      gap: "2px",
      color: theme.colors.muted,
      fontSize: "0.85rem",
      lineHeight: 1.45
    },
    dropdownWrap: {
      display: "grid",
      gap: theme.spacing.xs
    },
    select: {
      width: "100%",
      padding: `${theme.spacing.sm} ${theme.spacing.sm}`,
      borderRadius: theme.borderRadius.md,
      border: `1px solid ${theme.colors.border}`,
      background: theme.colors.surface,
      color: theme.colors.text,
      fontSize: "0.95rem",
      outline: "none"
    },
    helperText: {
      margin: 0,
      color: theme.colors.muted,
      fontSize: "0.85rem"
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: "0.95rem"
    },
    textarea: {
      minHeight: "180px"
    },
    requiredCallout: {
      border: `1px solid ${theme.colors.warning || theme.colors.border}`,
      background: `${theme.colors.warning || theme.colors.surfaceSoft}22`,
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      color: theme.colors.text,
      fontSize: "0.9rem"
    },
    actionsRow: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: theme.spacing.xs
    },
    nextActionCard: {
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.md,
      background: theme.colors.surface,
      padding: theme.spacing.sm,
      display: "grid",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm
    },
    timelineItem: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "0.85rem",
      padding: "2px 0"
    },
    historyItem: {
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.xs,
      background: theme.colors.surfaceSoft,
      display: "grid",
      gap: "2px"
    },
    memoryPanel: {
      border: `1px solid ${theme.colors.primary}22`,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      background: `${theme.colors.primary}08`,
      display: "grid",
      gap: theme.spacing.xs
    },
    memoryBadge: {
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: "999px",
      background: theme.colors.surfaceSoft,
      border: `1px solid ${theme.colors.border}`,
      color: theme.colors.muted,
      fontSize: "0.78rem"
    }
  };

  function avancarOrigemDropdown() {
    if (etapa !== "origem") return;

    if (!origemSelecionada) {
      setOrigemErro("Selecione a origem do Lead.");
      return;
    }

    const origemFinal = origemSelecionada === "outro" ? origemOutro.trim() : origemSelecionada;
    if (!origemFinal) {
      setOrigemErro("Informe a origem quando selecionar 'Outro'.");
      return;
    }

    setOrigemErro("");
    registarHistorico(`Origem selecionada: ${origemFinal}`);
    handleClick("dados", origemFinal);
  }

  function handleVoltarFluxo() {
    registarHistorico("Ação: voltar etapa");
    voltar();
  }

  function handleOpcaoFluxo(op) {
    registarHistorico(`Ação: ${op.texto}`);
    handleClick(op.next, op.origem);
  }

  function handleGuardarFrio() {
    registarHistorico("Ação final: Guardar Lead (frio)");
    salvarLead("frio");
  }

  function handleGuardarContinuarDepois() {
    registarHistorico("Ação: Guardar e Continuar Depois");
    guardarEContinuarDepois();
  }

  function handleRetomar() {
    const retomou = retomarFluxoGuardado();
    if (retomou) {
      registarHistorico("Ação: Fluxo retomado a partir do rascunho guardado");
    }
  }

  function atualizarEstadoConversa(estadoKey) {
    const timestamp = new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
    const etapaKey = etapaCopilotoAtual?.key ?? "";
    const etapaLabel = ETAPAS_TIMELINE[copilotoState.stepIndex] ?? etapaKey;
    const estadoLabel = (etapaCopilotoAtual?.estados || []).find((e) => e.key === estadoKey)?.label ?? estadoKey;
    const resposta = processarRespostaCopiloto({ stepIndex: copilotoState.stepIndex, estadoKey, ultimoEstado: estadoKey });
    const estrategia = resposta?.estrategia ?? "";
    const resultado = resposta?.finalizar ? "encerrado" : "avançou";
    setCopilotoState((prev) => ({
      ...prev,
      fase: "strategy",
      estadoConversa: estadoKey,
      ultimoEstado: estadoKey,
      historico: [...prev.historico, { etapa: etapaKey, etapaLabel, estado: estadoKey, estadoLabel, estrategia, resultado, timestamp }]
    }));
  }

  function continuarGuia() {
    if (!respostaContextualAtual || copilotoState.concluido) return;
    setCopilotoState((prev) =>
      continuarCopiloto(prev, respostaContextualAtual.nextStepIndex, respostaContextualAtual.finalizar)
    );
  }

  function voltarUmPassoGuia() {
    setCopilotoState((prev) => voltarUmPassoCopiloto(prev));
  }

  const copilotoMainContent = copilotoState.concluido ? (
    <section style={styles.drawerSectionCard}>
      <h4 style={styles.drawerSectionTitle}>Conversa concluída</h4>
      <p style={styles.drawerFieldText}>Todas as etapas foram percorridas.</p>
    </section>
  ) : etapaCopilotoAtual ? (
    <section key={`${etapaCopilotoAtual.key}-conteudo`} style={styles.drawerSectionCard}>
      <h4 style={styles.drawerSectionTitle}>Orientação atual</h4>
      {copilotoState.fase === "prompt" ? (
        <>
          <p style={styles.drawerFieldLabel}>Objetivo atual</p>
          <p style={styles.drawerFieldText}>{etapaCopilotoAtual.objetivo}</p>
          <p style={styles.drawerFieldLabel}>Perguntas sugeridas</p>
          <ul style={styles.drawerQuestionList}>
            {(etapaCopilotoAtual?.perguntas || []).map((pergunta) => (
              <li key={`${etapaCopilotoAtual.key}-${pergunta}`}>{pergunta}</li>
            ))}
          </ul>
          <p style={styles.drawerSectionPrompt}>Como respondeu o cliente?</p>
          <div style={styles.quickAnswerWrap}>
            {(etapaCopilotoAtual?.estados || etapaCopilotoAtual?.respostasRapidas || []).map((resposta) => (
              <button
                key={`${etapaCopilotoAtual.key}-${resposta.key}`}
                type="button"
                style={styles.quickAnswerButton}
                onClick={() => atualizarEstadoConversa(resposta.key)}
              >
                {resposta.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p style={styles.drawerFieldLabel}>Estratégia recomendada</p>
          <p style={styles.drawerFieldText}>{respostaContextualAtual?.estrategia}</p>
          <p style={styles.drawerFieldLabel}>Perguntas sugeridas</p>
          <ul style={styles.drawerQuestionList}>
            {(respostaContextualAtual?.perguntas || []).map((pergunta) => (
              <li key={`${etapaCopilotoAtual.key}-seguinte-${pergunta}`}>{pergunta}</li>
            ))}
          </ul>
          <p style={styles.drawerFieldLabel}>Sinais a observar</p>
          <p style={styles.drawerFieldText}>{respostaContextualAtual?.sinais}</p>
          <p style={styles.drawerFieldLabel}>O que evitar</p>
          <p style={styles.drawerFieldText}>{respostaContextualAtual?.evitar}</p>
          <p style={styles.drawerFieldLabel}>Critério para avançar</p>
          <p style={styles.drawerFieldText}>{respostaContextualAtual?.criterioAvanco}</p>
          <p style={styles.drawerFieldLabel}>Critério para terminar com elegância</p>
          <p style={styles.drawerFieldText}>{respostaContextualAtual?.criterioFimElegante}</p>
          {respostaContextualAtual?.encerramento ? (
            <>
              <p style={styles.drawerFieldLabel}>Encerramento sugerido</p>
              <p style={styles.drawerFieldText}>{respostaContextualAtual.encerramento}</p>
            </>
          ) : null}
          <Button color="light" style={styles.buttonFull} onClick={continuarGuia}>
            Continuar →
          </Button>
        </>
      )}
    </section>
  ) : null;

  return (
    <>
      <Card style={styles.container}>
        <div style={styles.pageLayout}>
          <div style={styles.mainColumn}>
            <div style={styles.header}>
              <div>
                <h2 style={styles.title}>{mostrarObs ? "Motivo da recusa" : node.pergunta}</h2>
                <p style={styles.subtitle}>Siga o guião para manter o processo profissional e ágil.</p>
                <div style={styles.progressWrap}>
                  <span style={styles.progressLabel}>Etapa {etapaAtual} de {totalEtapas}</span>
                  <div style={styles.progressTrack}>
                    <div style={styles.progressFill} />
                  </div>
                </div>
              </div>

              {historico.length > 0 && (
                <Button color="light" style={styles.buttonFull} onClick={handleVoltarFluxo}>
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
                <div style={styles.requiredCallout}>Registe no painel Observações o motivo da recusa para manter o histórico do contacto.</div>
                <div style={styles.actions}>
                  <Button color="light" onClick={handleVoltarFluxo}>
                    ↩️ Voltar
                  </Button>
                  <Button color="danger" onClick={handleGuardarFrio}>
                    Guardar Lead
                  </Button>
                </div>
              </div>
            ) : etapa === "origem" ? (
              <div style={styles.formGrid}>
                <div style={styles.dropdownWrap}>
                  <select
                    style={styles.select}
                    value={origemSelecionada}
                    onChange={(event) => {
                      const valor = event.target.value;
                      setOrigemSelecionada(valor);
                      if (valor !== "outro") setOrigemOutro("");
                      setOrigemErro("");
                    }}
                  >
                    <option value="">Selecionar origem do Lead...</option>
                    {origemOptions.map((item) => (
                      <option key={item.label} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                  <p style={styles.helperText}>Selecione a origem para iniciar o fluxo comercial.</p>
                </div>

                {origemSelecionada === "outro" && (
                  <Input
                    placeholder="Indique a origem"
                    value={origemOutro}
                    onChange={(event) => {
                      setOrigemOutro(event.target.value);
                      setOrigemErro("");
                    }}
                  />
                )}

                {origemErro ? <div style={styles.errorText}>{origemErro}</div> : null}

                <div style={styles.actions}>
                  <div style={styles.actionsRow}>
                    <Button style={styles.buttonFull} onClick={avancarOrigemDropdown}>Continuar</Button>
                    <Button color="light" style={styles.buttonFull} onClick={handleGuardarContinuarDepois}>Guardar e Continuar Depois</Button>
                    {existeFluxoGuardado() ? (
                      <Button color="light" style={styles.buttonFull} onClick={handleRetomar}>Retomar fluxo guardado</Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div style={styles.actions}>
                {node.opcoes?.map((op) => (
                  <Button
                    key={op.texto}
                    style={styles.buttonFull}
                    onClick={() => handleOpcaoFluxo(op)}
                  >
                    {op.texto}
                  </Button>
                ))}
                <div style={styles.actionsRow}>
                  <Button color="light" style={styles.buttonFull} onClick={handleGuardarContinuarDepois}>Guardar e Continuar Depois</Button>
                  {existeFluxoGuardado() ? (
                    <Button color="light" style={styles.buttonFull} onClick={handleRetomar}>Retomar fluxo guardado</Button>
                  ) : null}
                </div>
              </div>
            )}

            {mostrarProximaAcao ? (
              <div style={styles.nextActionCard}>
                <h3 style={styles.panelTitle}>Próxima Ação</h3>
                <select
                  style={styles.select}
                  value={proximaAcao}
                  onChange={(event) => {
                    setProximaAcao(event.target.value);
                    if (event.target.value) {
                      registarHistorico(`Próxima ação definida: ${event.target.value}`);
                    }
                  }}
                >
                  <option value="">Selecionar...</option>
                  <option value="Agendar visita">Agendar visita</option>
                  <option value="Recontactar">Recontactar</option>
                  <option value="Enviar documentação">Enviar documentação</option>
                  <option value="Encerrar lead">Encerrar lead</option>
                  <option value="Sem interesse">Sem interesse</option>
                </select>
              </div>
            ) : null}
          </div>

          <aside style={styles.asideColumn}>
            <div style={styles.panelCard}>
              <h3 style={styles.panelTitle}>Observações da chamada</h3>
              <p style={styles.panelText}>Este painel permanece disponível durante todo o Fluxo.</p>
              <Input
                as="textarea"
                style={styles.textarea}
                placeholder="Registar observações da chamada..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            <div style={styles.panelCard}>
              <Button
                color="light"
                style={styles.drawerToggle}
                onClick={() => setGuiaAberto((valor) => !valor)}
              >
                📘 Copiloto Comercial {guiaAberto ? "▾" : "▸"}
              </Button>
              <p style={styles.panelText}>Abra o copiloto sem interromper o atendimento.</p>
            </div>

            <div style={styles.panelCard}>
              <h3 style={styles.panelTitle}>Histórico da Conversa</h3>
              <p style={styles.panelText}>Registo cronológico de ações do atendimento atual.</p>
              <div style={styles.timelineList}>
                {historicoConversa.length === 0 ? <p style={styles.panelText}>Sem ações registadas ainda.</p> : null}
                {historicoConversa.map((item) => (
                  <div key={item.id} style={styles.timelineRow}>
                    <strong>{item.acao}</strong>
                    <span style={styles.timelineTime}>{item.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </Card>

      <FloatingWindow
        id="copiloto-comercial"
        title="📘 Copiloto Comercial"
        isOpen={guiaAberto}
        onClose={() => setGuiaAberto(false)}
        defaultPosition={{ x: 20, y: 80 }}
        maxWidth={380}
      >
        <div style={styles.memoryPanel}>
          <p style={{ ...styles.drawerFieldLabel, color: theme.colors.primary, margin: 0 }}>Objetivo atual</p>
          <p style={styles.drawerFieldText}>{conversationMemory.objetivoAtual}</p>
          {conversationMemory.resumo && (
            <>
              <p style={{ ...styles.drawerFieldLabel, margin: "4px 0 0" }}>Resumo da conversa</p>
              <p style={styles.drawerFieldText}>{conversationMemory.resumo}</p>
            </>
          )}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <span style={styles.memoryBadge}>📊 {conversationMemory.progresso.atual}/{conversationMemory.progresso.total}</span>
            {conversationMemory.ultimoEstado && (
              <span style={styles.memoryBadge}>💬 {conversationMemory.ultimoEstado}</span>
            )}
            {conversationMemory.estrategiaAtual && (
              <span style={styles.memoryBadge} title={conversationMemory.estrategiaAtual}>💡 Estratégia ativa</span>
            )}
          </div>
        </div>
        <div style={{ display: "grid", gap: "4px" }}>
          {ETAPAS_TIMELINE.map((label, index) => {
            const isCurrent = index === dadosCopiloto.stepIndex;
            const isDone = index < dadosCopiloto.stepIndex;
            return (
              <div key={label} style={{ ...styles.timelineItem, color: isCurrent ? theme.colors.primary : isDone ? theme.colors.success : theme.colors.muted, fontWeight: isCurrent ? 600 : 400 }}>
                <span>{isDone ? "✔" : isCurrent ? "▶" : "○"}</span>
                <span>{label}</span>
              </div>
            );
          })}
        </div>
        <Button color="light" style={styles.buttonFull} onClick={voltarUmPassoGuia} disabled={dadosCopiloto.stepIndex === 0}>
          ↩️ Recuar 1 passo
        </Button>
        {copilotoState.historico.length > 0 && (
          <div style={styles.drawerSectionCard}>
            <h4 style={styles.drawerSectionTitle}>Histórico da negociação</h4>
            <div style={{ display: "grid", gap: "4px", maxHeight: "160px", overflowY: "auto" }}>
              {copilotoState.historico.map((item, idx) => (
                <div key={idx} style={styles.historyItem}>
                  <span style={{ color: theme.colors.muted, fontSize: "0.75rem" }}>{item.timestamp}</span>
                  <span style={{ color: theme.colors.text, fontSize: "0.82rem", fontWeight: 600 }}>{item.etapaLabel || item.etapa}</span>
                  <span style={{ color: theme.colors.text, fontSize: "0.82rem" }}>{item.estadoLabel || item.estado}</span>
                  {item.estrategia && (
                    <span style={{ color: theme.colors.muted, fontSize: "0.8rem", lineHeight: 1.35 }}>Estratégia: {item.estrategia}</span>
                  )}
                  {item.resultado && (
                    <span style={{ color: item.resultado === "encerrado" ? theme.colors.danger : theme.colors.success, fontSize: "0.75rem" }}>
                      {item.resultado === "encerrado" ? "⏼ Encerrado" : "✅ Avançou"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {copilotoMainContent}
      </FloatingWindow>
    </>
  );
}

