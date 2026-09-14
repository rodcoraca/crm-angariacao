import { useCallback, useEffect, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useAuthContext } from "../modules/auth/context";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { notifyError, notifySuccess } from "../components/ui/feedbackBus";
import { listarUsuarios } from "../modules/users/services";
import {
  listarEscalaServicoPorSemana,
  publicarEscalaServico,
  substituirEscalaServico,
} from "../modules/servicos/services";

const DIAS_SEMANA = [
  { value: "segunda-feira", label: "Segunda-feira" },
  { value: "terca-feira", label: "Terça-feira" },
  { value: "quarta-feira", label: "Quarta-feira" },
  { value: "quinta-feira", label: "Quinta-feira" },
  { value: "sexta-feira", label: "Sexta-feira" },
];

const PERIODOS = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
];

const DIAS_ESCALA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

const POSICOES_ESCALA = [
  { dia: "segunda-feira", label: "Segunda", periodo: "manha", horaInicio: "09:00", horaFim: "13:00" },
  { dia: "segunda-feira", label: "Segunda", periodo: "tarde", horaInicio: "14:00", horaFim: "18:00" },
  { dia: "terca-feira", label: "Terça", periodo: "manha", horaInicio: "09:00", horaFim: "13:00" },
  { dia: "terca-feira", label: "Terça", periodo: "tarde", horaInicio: "14:00", horaFim: "18:00" },
  { dia: "quarta-feira", label: "Quarta", periodo: "manha", horaInicio: "09:00", horaFim: "13:00" },
  { dia: "quarta-feira", label: "Quarta", periodo: "tarde", horaInicio: "14:00", horaFim: "18:00" },
  { dia: "quinta-feira", label: "Quinta", periodo: "manha", horaInicio: "09:00", horaFim: "13:00" },
  { dia: "quinta-feira", label: "Quinta", periodo: "tarde", horaInicio: "14:00", horaFim: "18:00" },
  { dia: "sexta-feira", label: "Sexta", periodo: "manha", horaInicio: "09:00", horaFim: "13:00" },
  { dia: "sexta-feira", label: "Sexta", periodo: "tarde", horaInicio: "14:00", horaFim: "18:00" },
];

function getWeekStart(dateValue) {
  const date = new Date(`${dateValue || new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const diff = (date.getUTCDay() + 6) % 7;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - diff);
  return monday;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function construirEscalaVazia() {
  return DIAS_ESCALA.map((dia) => ({ dia, manha: null, tarde: null }));
}

function normalizarSemanaSelecionada(value) {
  if (!value) {
    return toIsoDate(getWeekStart(new Date()));
  }

  return toIsoDate(getWeekStart(value));
}

function criarLinhaExcecaoVazia() {
  return { dias: [], periodo: "" };
}

function getDiaIndexByKey(diaKey) {
  return DIAS_SEMANA.findIndex((dia) => dia.value === diaKey);
}

function formatarDias(dias) {
  if (!Array.isArray(dias) || dias.length === 0) return "Sem dias definidos";
  return dias
    .map((dia) => DIAS_SEMANA.find((item) => item.value === dia)?.label || dia)
    .join(", ");
}

function formatarHorario(inicio, fim) {
  const horaInicio = String(inicio || "").trim();
  const horaFim = String(fim || "").trim();

  if (!horaInicio && !horaFim) return "Sem horário definido";
  return `${horaInicio || "--:--"} - ${horaFim || "--:--"}`;
}

function isUsuarioAtivo(usuario) {
  if (!usuario) return false;
  if (usuario.ativo === false || usuario.active === false) return false;
  const accountStatus = String(usuario.account_status || "").trim().toLowerCase();
  return accountStatus !== "disabled" && accountStatus !== "inactive";
}

function getNomeCompletoUsuario(usuario) {
  const parts = [usuario?.nome, usuario?.apelido].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  if (usuario?.username) return usuario.username;
  if (usuario?.email) return usuario.email;
  return "Utilizador";
}

function construirLinhasPersistencia(escala, semanaReferencia) {
  const inicioSemana = new Date(`${semanaReferencia}T00:00:00Z`);
  const linhas = [];

  escala.forEach((linha, diaIndex) => {
    const diaDate = new Date(inicioSemana);
    diaDate.setUTCDate(inicioSemana.getUTCDate() + diaIndex);

    [
      { periodo: "manha", horaInicio: "09:00", horaFim: "13:00" },
      { periodo: "tarde", horaInicio: "14:00", horaFim: "18:00" },
    ].forEach(({ periodo, horaInicio, horaFim }) => {
      const atribuicao = linha[periodo];
      if (!atribuicao) return;
      linhas.push({
        data: toIsoDate(diaDate),
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        usuario_id: atribuicao.id,
        titulo: atribuicao.nome,
      });
    });
  });

  return linhas;
}

export default function Servicos() {
  const theme = useTheme();
  const { user } = useAuthContext();

  const [usuariosEmpresa, setUsuariosEmpresa] = useState([]);
  const [escalaGerada, setEscalaGerada] = useState([]);
  const [escalaMeta, setEscalaMeta] = useState(null);
  const [participacaoLocal, setParticipacaoLocal] = useState({});
  const [semanaReferencia, setSemanaReferencia] = useState(() => normalizarSemanaSelecionada(new Date().toISOString().slice(0, 10)));
  const [excecoesPorUsuario, setExcecoesPorUsuario] = useState({});
  const [excecaoEmEdicaoPorUsuario, setExcecaoEmEdicaoPorUsuario] = useState({});

  const semanaLabel = (() => {
    if (!semanaReferencia) return "Semana";
    const start = new Date(`${semanaReferencia}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 4);
    const formatter = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
    return `${formatter.format(start)} — ${formatter.format(end)}`;
  })();

  const userId = user?.id;
  const empresaId = user?.empresa_id;

  const carregarUsuariosEmpresa = useCallback(async () => {
    const { data, error } = await listarUsuarios({ currentUser: user });
    if (error) {
      notifyError(error.message || "Não foi possível carregar os utilizadores da empresa.");
      setUsuariosEmpresa([]);
      return;
    }

    setUsuariosEmpresa((data || []).filter(isUsuarioAtivo));
  }, [userId, empresaId]);

  const carregarEscalaPersistida = useCallback(async () => {
    if (!user?.id) {
      setEscalaGerada([]);
      setEscalaMeta(null);
      return;
    }

    const { data, error } = await listarEscalaServicoPorSemana({ user, semanaInicio: semanaReferencia });

    if (error) {
      notifyError(error.message || "Não foi possível carregar a escala do serviço.");
      setEscalaGerada([]);
      setEscalaMeta(null);
      return;
    }

    const linhasEscala = construirEscalaVazia();
    const escalaDoServico = data?.escalas_servico_linhas || [];
    setEscalaMeta(data || null);

    escalaDoServico.forEach((item) => {
      const diaData = new Date(`${item.data}T00:00:00`);
      const diaIndex = getDiaIndexByKey(getDiaKeyFromDate(diaData));
      if (diaIndex < 0) return;

      const periodo = item.hora_inicio && item.hora_inicio >= "13:00" ? "tarde" : "manha";
      const linha = linhasEscala[diaIndex];
      if (!linha) return;
      linha[periodo] = { id: item.usuario_id, nome: item.titulo || "Comercial" };
    });

    setEscalaGerada(linhasEscala);
  }, [semanaReferencia, user]);

  useEffect(() => {
    if (!user?.id) return;
    carregarUsuariosEmpresa();
  }, [user?.id, user?.empresa_id]);

  useEffect(() => {
    if (!user?.id) {
      setEscalaGerada([]);
      setEscalaMeta(null);
      return;
    }

    carregarEscalaPersistida();
  }, [user?.id, user?.empresa_id, semanaReferencia, carregarEscalaPersistida]);

  const handleAlterarExcecaoEmEdicao = useCallback((usuarioId, field, value) => {
    setExcecaoEmEdicaoPorUsuario((prev) => ({
      ...prev,
      [usuarioId]: { ...(prev[usuarioId] || criarLinhaExcecaoVazia()), [field]: value },
    }));
  }, []);

  const handleAlternarDiaExcecao = useCallback((usuarioId, dia) => {
    setExcecaoEmEdicaoPorUsuario((prev) => {
      const atual = prev[usuarioId] || criarLinhaExcecaoVazia();
      const diasAtuais = Array.isArray(atual.dias) ? atual.dias : [];
      const dias = diasAtuais.includes(dia) ? diasAtuais.filter((item) => item !== dia) : [...diasAtuais, dia];
      return { ...prev, [usuarioId]: { ...atual, dias } };
    });
  }, []);

  const handleAdicionarExcecao = useCallback((usuarioId) => {
    const excecao = excecaoEmEdicaoPorUsuario[usuarioId] || criarLinhaExcecaoVazia();
    const dias = Array.isArray(excecao.dias) ? excecao.dias.filter(Boolean) : [];
    const periodo = excecao.periodo || "";

    if (dias.length === 0 || !periodo) {
      notifyError("Selecione pelo menos um dia e um período para adicionar a exceção.");
      return;
    }

    const existentes = excecoesPorUsuario[usuarioId] || [];
    const diasSelecionados = new Set(dias);
    const duplicado = existentes.some((item) => {
      if (item?.periodo !== periodo || !Array.isArray(item?.dias) || item.dias.length === 0) return false;
      const diasExistentes = new Set(item.dias);
      return [...diasSelecionados].every((dia) => diasExistentes.has(dia)) || [...diasExistentes].every((dia) => diasSelecionados.has(dia));
    });

    if (duplicado) {
      notifyError("Já existe uma combinação equivalente de dias e período para este comercial.");
      return;
    }

    setExcecoesPorUsuario((prev) => ({
      ...prev,
      [usuarioId]: [...(prev[usuarioId] || []), { dias, periodo }],
    }));
    setExcecaoEmEdicaoPorUsuario((prev) => ({ ...prev, [usuarioId]: criarLinhaExcecaoVazia() }));
  }, [excecaoEmEdicaoPorUsuario, excecoesPorUsuario]);

  const handleRemoverExcecao = useCallback((usuarioId, index) => {
    setExcecoesPorUsuario((prev) => ({
      ...prev,
      [usuarioId]: (prev[usuarioId] || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  }, []);

  function handleToggleParticipante(usuario) {
    if (!usuario?.id) return;

    const usuarioId = String(usuario.id);
    const proximoEstado = !Boolean(participacaoLocal[usuarioId]);
    setParticipacaoLocal((prev) => ({ ...prev, [usuarioId]: proximoEstado }));
  }

  const getDiaKeyFromDate = (date) => {
    const index = date.getDay();
    const dia = index === 1 ? "segunda-feira" : index === 2 ? "terca-feira" : index === 3 ? "quarta-feira" : index === 4 ? "quinta-feira" : index === 5 ? "sexta-feira" : "segunda-feira";
    return dia;
  };

  const gerarEscala = useCallback(async () => {
    const participantesAtivos = usuariosEmpresa.filter((usuario) => Boolean(participacaoLocal[String(usuario.id)]));

    if (usuariosEmpresa.length === 0) {
      notifyError("Não existem Comerciais de Serviço disponíveis.");
      return;
    }

    if (participantesAtivos.length === 0) {
      notifyError('Selecione pelo menos um Comercial de Serviço em "Participa".');
      return;
    }

    const escalaBase = construirEscalaVazia();
    const contagemPorUsuario = {};

    for (const posicao of POSICOES_ESCALA) {
      const elegiveis = participantesAtivos.filter((usuario) => {
        const usuarioId = String(usuario.id);
        const excecoesUsuario = (excecoesPorUsuario[usuarioId] || []).filter((excecao) => Array.isArray(excecao?.dias) && excecao.dias.length > 0 && Boolean(excecao?.periodo));
        return !excecoesUsuario.some((excecao) => excecao.dias.includes(posicao.dia) && excecao.periodo === posicao.periodo);
      });

      const candidatosElegiveis = elegiveis.filter((usuario) => {
        const usuarioId = String(usuario.id);
        const linha = escalaBase.find((item) => item.dia === DIAS_ESCALA[getDiaIndexByKey(posicao.dia)]);
        if (!linha) return true;
        return !((posicao.periodo === "manha" && linha.manha && String(linha.manha.id) === usuarioId) || (posicao.periodo === "tarde" && linha.tarde && String(linha.tarde.id) === usuarioId));
      });

      if (candidatosElegiveis.length === 0) {
        notifyError("Não é possível completar a escala com as regras selecionadas. Ajuste os participantes ou as exceções.");
        return;
      }

      const indice = candidatosElegiveis
        .map((usuario) => ({ usuario, contagem: contagemPorUsuario[String(usuario.id)] || 0 }))
        .sort((a, b) => a.contagem - b.contagem || Math.random() - 0.5)[0];

      const usuarioEscolhido = indice.usuario;
      const diaIndex = DIAS_SEMANA.findIndex((dia) => dia.value === posicao.dia);
      const linha = escalaBase[diaIndex];
      if (!linha) continue;

      linha[posicao.periodo] = { id: usuarioEscolhido.id, nome: getNomeCompletoUsuario(usuarioEscolhido) };
      contagemPorUsuario[String(usuarioEscolhido.id)] = (contagemPorUsuario[String(usuarioEscolhido.id)] || 0) + 1;
    }

    const escalaCompleta = escalaBase.every((linha) => linha.manha && linha.tarde);
    if (!escalaCompleta) {
      notifyError("A escala ainda está incompleta. Não foi persistida.");
      return;
    }

    const linhasParaPersistir = construirLinhasPersistencia(escalaBase, semanaReferencia);

    try {
      const result = await substituirEscalaServico({ user, semanaInicio: semanaReferencia, linhas: linhasParaPersistir });

      if (result.error) {
        throw result.error;
      }

      setEscalaGerada(escalaBase);
      await carregarEscalaPersistida();
      notifySuccess("Escala gerada e persistida com sucesso.");
    } catch (error) {
      notifyError(error?.message || "Não foi possível persistir a escala gerada.");
    }
  }, [usuariosEmpresa, participacaoLocal, excecoesPorUsuario, semanaReferencia, user, carregarEscalaPersistida]);

  const handleAlterarSlot = useCallback((dia, periodo, usuarioId) => {
    if (escalaMeta?.estado === "publicada") return;
    const usuario = usuariosEmpresa.find((item) => String(item.id) === String(usuarioId));
    if (!usuario) return;

    setEscalaGerada((prev) => prev.map((linha) => (
      linha.dia === dia
        ? { ...linha, [periodo]: { id: usuario.id, nome: getNomeCompletoUsuario(usuario) } }
        : linha
    )));
  }, [escalaMeta?.estado, usuariosEmpresa]);

  const guardarEscalaEditada = useCallback(async () => {
    if (escalaMeta?.estado === "publicada") return;
    const linhasParaPersistir = construirLinhasPersistencia(escalaGerada, semanaReferencia);
    if (linhasParaPersistir.length !== POSICOES_ESCALA.length) {
      notifyError("A escala precisa de dez slots preenchidos.");
      return;
    }

    const result = await substituirEscalaServico({ user, semanaInicio: semanaReferencia, linhas: linhasParaPersistir });
    if (result.error) {
      notifyError(result.error.message || "Não foi possível guardar a escala alterada.");
      return;
    }

    await carregarEscalaPersistida();
    notifySuccess("Escala alterada e guardada com sucesso.");
  }, [escalaGerada, escalaMeta?.estado, semanaReferencia, user, carregarEscalaPersistida]);

  const publicarEscala = useCallback(async () => {
    if (!escalaMeta?.id || escalaMeta.estado !== "rascunho") return;

    const linhasParaPersistir = construirLinhasPersistencia(escalaGerada, semanaReferencia);
    if (linhasParaPersistir.length !== POSICOES_ESCALA.length) {
      notifyError("A escala precisa de dez slots preenchidos.");
      return;
    }

    const result = await publicarEscalaServico({ user, escalaId: escalaMeta.id });
    if (result.error) {
      notifyError(result.error.message || "Não foi possível publicar a escala.");
      return;
    }

    await carregarEscalaPersistida();
    notifySuccess("Escala publicada com sucesso.");
  }, [escalaGerada, escalaMeta, semanaReferencia, user, carregarEscalaPersistida]);

  const handleSemanaAnterior = useCallback(() => {
    const date = new Date(`${semanaReferencia}T00:00:00`);
    date.setDate(date.getDate() - 7);
    setSemanaReferencia(normalizarSemanaSelecionada(toIsoDate(date)));
    setExcecoesPorUsuario({});
    setExcecaoEmEdicaoPorUsuario({});
    setParticipacaoLocal({});
  }, [semanaReferencia]);

  const handleSemanaSeguinte = useCallback(() => {
    const date = new Date(`${semanaReferencia}T00:00:00`);
    date.setDate(date.getDate() + 7);
    setSemanaReferencia(normalizarSemanaSelecionada(toIsoDate(date)));
    setExcecoesPorUsuario({});
    setExcecaoEmEdicaoPorUsuario({});
    setParticipacaoLocal({});
  }, [semanaReferencia]);

  const handleSemanaChange = useCallback((event) => {
    const value = event.target.value;
    setSemanaReferencia(normalizarSemanaSelecionada(value));
    setExcecoesPorUsuario({});
    setExcecaoEmEdicaoPorUsuario({});
    setParticipacaoLocal({});
  }, []);

  return (
    <div style={{ display: "grid", gap: theme.spacing.md }}>
      <div style={{ display: "grid", gap: theme.spacing.xs }}>
        <h2 style={{ margin: 0, color: theme.colors.text }}>Serviço</h2>
        <p style={{ margin: 0, color: theme.colors.muted }}>Escala semanal</p>
      </div>

      <Card style={{ padding: theme.spacing.md, border: `1px solid ${theme.colors.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm, flexWrap: "wrap" }}>
          <strong>Semana atual</strong>
          <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
            <Button type="button" variant="secondary" aria-label="Semana anterior" onClick={handleSemanaAnterior}>←</Button>
            <Button type="button" variant="secondary" aria-label="Semana seguinte" onClick={handleSemanaSeguinte}>→</Button>
          </div>
        </div>
      </Card>

      <Card style={{ padding: theme.spacing.md, border: `1px solid ${theme.colors.border}` }}>
        <h3 style={{ marginTop: 0 }}>Semana</h3>
        <div style={{ display: "grid", gap: 8, maxWidth: 280 }}>
          <Input
            type="date"
            label="Semana"
            value={semanaReferencia}
            onChange={handleSemanaChange}
          />
          <div style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${theme.colors.border}`, background: theme.colors.surfaceSoft, color: theme.colors.text }}>
            <strong style={{ color: theme.colors.text }}>Segunda-feira → Sexta-feira</strong>
            <div style={{ marginTop: 4, color: theme.colors.muted }}>{semanaLabel}</div>
          </div>
        </div>
      </Card>

      <Card style={{ padding: theme.spacing.md, border: `1px solid ${theme.colors.border}` }}>
        <h3 style={{ marginTop: 0 }}>Comerciais</h3>

        <div style={{ display: "grid", gap: theme.spacing.sm }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${theme.colors.border}` }}>Comercial</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${theme.colors.border}` }}>Participa</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${theme.colors.border}` }}>Dias da semana / Exceções</th>
                </tr>
              </thead>
              <tbody>
                {usuariosEmpresa.length > 0 ? usuariosEmpresa.map((usuario) => {
                  const usuarioId = String(usuario.id);
                  const excecoes = excecoesPorUsuario[usuarioId] || [];
                  const excecaoEmEdicao = excecaoEmEdicaoPorUsuario[usuarioId] || criarLinhaExcecaoVazia();
                  const checked = Boolean(participacaoLocal[usuarioId]);

                  return (
                    <tr key={usuarioId}>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${theme.colors.border}` }}>{getNomeCompletoUsuario(usuario)}</td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${theme.colors.border}` }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleParticipante(usuario)}
                        />
                      </td>
                                      <td style={{ padding: "10px", borderBottom: `1px solid ${theme.colors.border}` }}>
                                        <div style={{ display: "grid", gap: 8 }}>
                                          {excecoes.length > 0 ? (
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                              {excecoes.map((excecao, index) => (
                                                <span
                                                  key={`${usuarioId}-excecao-${index}`}
                                                  style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 999, border: `1px solid ${theme.colors.border}`, background: theme.colors.surfaceSoft, color: theme.colors.text, fontSize: 12 }}
                                                >
                                                  <span>{formatarDias(excecao.dias)}</span>
                                                  <span>·</span>
                                                  <span>{PERIODOS.find((periodo) => periodo.value === excecao.periodo)?.label || excecao.periodo}</span>
                                                  <button
                                                    type="button"
                                                    aria-label={`Remover exceção ${index + 1}`}
                                                    onClick={() => handleRemoverExcecao(usuarioId, index)}
                                                    style={{ border: 0, background: "transparent", color: theme.colors.text, cursor: "pointer", padding: 0, fontSize: 16, lineHeight: 1 }}
                                                  >
                                                    ×
                                                  </button>
                                                </span>
                                              ))}
                                            </div>
                                          ) : null}
                                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                            <details>
                                              <summary style={{ cursor: "pointer", padding: "6px 8px", border: `1px solid ${theme.colors.border}`, color: theme.colors.text }}>
                                                {excecaoEmEdicao.dias.length > 0 ? formatarDias(excecaoEmEdicao.dias) : "Selecionar dias"}
                                              </summary>
                                              <div style={{ display: "grid", gap: 4, padding: "8px 0" }}>
                                                {DIAS_SEMANA.map((dia) => (
                                                  <button
                                                    key={dia.value}
                                                    type="button"
                                                    aria-pressed={excecaoEmEdicao.dias.includes(dia.value)}
                                                    onClick={() => handleAlternarDiaExcecao(usuarioId, dia.value)}
                                                    style={{ textAlign: "left", padding: "6px 8px", border: `1px solid ${theme.colors.border}`, background: excecaoEmEdicao.dias.includes(dia.value) ? theme.colors.surfaceSoft : theme.colors.surface, color: theme.colors.text }}
                                                  >
                                                    {dia.label}
                                                  </button>
                                                ))}
                                              </div>
                                            </details>
                                            <select
                                              value={excecaoEmEdicao.periodo}
                                              onChange={(event) => handleAlterarExcecaoEmEdicao(usuarioId, "periodo", event.target.value)}
                                              style={{ padding: "6px 8px", color: theme.colors.text }}
                                            >
                                              <option value="">Selecionar período</option>
                                              {PERIODOS.map((periodo) => (
                                                <option key={periodo.value} value={periodo.value}>{periodo.label}</option>
                                              ))}
                                            </select>
                                            <Button type="button" variant="secondary" onClick={() => handleAdicionarExcecao(usuarioId)}>
                                              Adicionar
                                            </Button>
                                          </div>
                                        </div>
                                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="3" style={{ padding: "12px", color: theme.colors.muted }}>
                      Sem utilizadores ativos disponíveis na empresa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card style={{ padding: theme.spacing.md, border: `1px solid ${theme.colors.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Escala da semana</h3>
          <div style={{ display: "flex", gap: theme.spacing.xs, flexWrap: "wrap" }}>
            <Button type="button" variant="primary" onClick={gerarEscala}>
              Gerar escala
            </Button>
            {escalaGerada.length > 0 && escalaMeta?.estado === "rascunho" ? (
              <Button type="button" variant="secondary" onClick={guardarEscalaEditada}>
                Guardar alterações
              </Button>
            ) : null}
            {escalaGerada.length > 0 && escalaMeta?.estado === "rascunho" ? (
              <Button type="button" variant="primary" onClick={publicarEscala}>
                Publicar escala
              </Button>
            ) : null}
          </div>
        </div>

        {escalaMeta?.estado === "publicada" ? (
          <div style={{ marginTop: theme.spacing.sm, color: theme.colors.success, fontWeight: 600 }}>
            PUBLICADA — não editável
          </div>
        ) : escalaMeta?.estado === "rascunho" ? (
          <div style={{ marginTop: theme.spacing.sm, color: theme.colors.muted }}>Rascunho editável</div>
        ) : null}

        {escalaGerada.length === 0 ? (
          <div style={{ padding: "28px 16px", textAlign: "center", color: theme.colors.muted }}>
            Ainda não existe escala gerada para esta semana.
          </div>
        ) : (
          <div style={{ overflowX: "auto", marginTop: theme.spacing.md }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: "8px 10px", borderBottom: `1px solid ${theme.colors.border}` }}>Dia</th>
                  {PERIODOS.map((periodo) => (
                    <th key={periodo.value} style={{ padding: "8px 10px", borderBottom: `1px solid ${theme.colors.border}` }}>{periodo.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {escalaGerada.map((diaEscala) => (
                  <tr key={diaEscala.dia}>
                    <td style={{ padding: "10px", borderBottom: `1px solid ${theme.colors.border}`, fontWeight: 600 }}>{diaEscala.dia}</td>
                    <td style={{ padding: "10px", borderBottom: `1px solid ${theme.colors.border}` }}>
                      {escalaMeta?.estado === "publicada" ? diaEscala.manha?.nome || "—" : (
                        <select
                          aria-label={`${diaEscala.dia} Manhã`}
                          value={diaEscala.manha?.id || ""}
                          onChange={(event) => handleAlterarSlot(diaEscala.dia, "manha", event.target.value)}
                          style={{ width: "100%", padding: "6px 8px", color: theme.colors.text }}
                        >
                          <option value="">Selecionar comercial</option>
                          {usuariosEmpresa.map((usuario) => (
                            <option key={usuario.id} value={usuario.id}>{getNomeCompletoUsuario(usuario)}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td style={{ padding: "10px", borderBottom: `1px solid ${theme.colors.border}` }}>
                      {escalaMeta?.estado === "publicada" ? diaEscala.tarde?.nome || "—" : (
                        <select
                          aria-label={`${diaEscala.dia} Tarde`}
                          value={diaEscala.tarde?.id || ""}
                          onChange={(event) => handleAlterarSlot(diaEscala.dia, "tarde", event.target.value)}
                          style={{ width: "100%", padding: "6px 8px", color: theme.colors.text }}
                        >
                          <option value="">Selecionar comercial</option>
                          {usuariosEmpresa.map((usuario) => (
                            <option key={usuario.id} value={usuario.id}>{getNomeCompletoUsuario(usuario)}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  );
}

