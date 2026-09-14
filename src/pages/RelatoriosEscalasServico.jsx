import { useEffect, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useAuthContext } from "../modules/auth/context";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { notifyError, notifySuccess } from "../components/ui/feedbackBus";
import { listarUsuarios } from "../modules/users/services";
import {
  listarEscalasServicoPublicadas,
  obterEscalaServicoPublicada,
  listarPlantoesPublicados,
  obterPlantaoPublicado,
  enviarEscalaPublicadaPorEmail,
} from "../modules/servicos/services";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

function formatarData(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short" }).format(new Date(`${value}T00:00:00`));
}

function formatarDataHora(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function linhasPorDia(linhas = []) {
  return DIAS.map((dia, index) => {
    const linhaData = linhas.filter((linha) => {
      const date = new Date(`${linha.data}T00:00:00`);
      return ((date.getDay() + 6) % 7) === index;
    });
    return {
      dia,
      manha: linhaData.find((linha) => linha.hora_inicio < "13:00"),
      tarde: linhaData.find((linha) => linha.hora_inicio >= "13:00"),
    };
  });
}

export default function RelatoriosEscalasServico() {
  const theme = useTheme();
  const { user } = useAuthContext();
  const [escalas, setEscalas] = useState([]);
  const [escalaSelecionada, setEscalaSelecionada] = useState(null);
  const [nomesUtilizadores, setNomesUtilizadores] = useState({});
  const [plantoes, setPlantoes] = useState([]);
  const [plantaoSelecionado, setPlantaoSelecionado] = useState(null);
  const [sendingKey, setSendingKey] = useState(null);
  const [lastEmailSentAt, setLastEmailSentAt] = useState({});

  function emailResultMessage(result, label) {
    if (result.falhados > 0 && result.enviados > 0) {
      return `${label} enviada para ${result.enviados} de ${result.total} comerciais. ${result.falhados} envio falhou.`;
    }
    if (result.enviados > 0) {
      return `${label} enviada com sucesso para ${result.enviados} comerciais.`;
    }
    return `${label} não foi enviada. ${result.falhados || result.total} destinatário(s) falharam.`;
  }

  async function enviarEmail(escalaId, tipo, label) {
    const key = `${tipo}:${escalaId}`;
    setSendingKey(key);
    const result = await enviarEscalaPublicadaPorEmail({ user, escalaId, tipo });
    setSendingKey(null);
    if (result.error) {
      notifyError(result.error.message || `Não foi possível enviar ${label.toLowerCase()}.`);
      return;
    }
    setLastEmailSentAt((previous) => ({ ...previous, [key]: new Date().toISOString() }));
    const message = emailResultMessage(result.data, label);
    if (result.data.falhados > 0) notifyError(message);
    else notifySuccess(message);
  }

  useEffect(() => {
    let ativo = true;
    Promise.all([
      listarEscalasServicoPublicadas({ user }),
      listarPlantoesPublicados({ user }),
      listarUsuarios({ currentUser: user }),
    ]).then(([escalaResult, plantaoResult, usersResult]) => {
      if (!ativo) return;
      if (escalaResult.error) {
        notifyError(escalaResult.error.message || "Não foi possível carregar as escalas publicadas.");
        return;
      }
      const nomes = {};
      (usersResult.data || []).forEach((item) => {
        nomes[String(item.id)] = [item.nome, item.apelido].filter(Boolean).join(" ") || item.username || item.email || "Comercial";
      });
      setNomesUtilizadores(nomes);
      setEscalas(escalaResult.data || []);
      setPlantoes(plantaoResult.data || []);
    });
    return () => { ativo = false; };
  }, [user]);

  async function verEscala(escala) {
    const result = await obterEscalaServicoPublicada({ user, escalaId: escala.id });
    if (result.error) {
      notifyError(result.error.message || "Não foi possível abrir o relatório.");
      return;
    }
    setEscalaSelecionada(result.data || escala);
  }

  async function verPlantao(plantao) {
    const result = await obterPlantaoPublicado({ user, escalaId: plantao.escala_id });
    if (result.error) {
      notifyError(result.error.message || "Não foi possível abrir o relatório de plantão.");
      return;
    }
    setPlantaoSelecionado(result.data || plantao);
  }

  return (
    <div style={{ display: "grid", gap: theme.spacing.md }}>
      <div>
        <h2 style={{ margin: 0 }}>Relatórios — Escalas de Serviço</h2>
        <p style={{ margin: "4px 0 0", color: theme.colors.muted }}>Apenas versões publicadas.</p>
      </div>

      <Card style={{ padding: theme.spacing.md, border: `1px solid ${theme.colors.border}` }}>
        <h3 style={{ marginTop: 0 }}>Escalas de Serviço</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${theme.colors.border}` }}>Semana</th>
                <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${theme.colors.border}` }}>Estado</th>
                <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${theme.colors.border}` }}>Data de publicação</th>
                <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${theme.colors.border}` }}>Publicado por</th>
                <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${theme.colors.border}` }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {escalas.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: "12px", color: theme.colors.muted }}>Sem escalas publicadas.</td></tr>
              ) : escalas.map((escala) => (
                <tr key={escala.id}>
                  <td style={{ padding: "10px" }}>{formatarData(escala.semana_inicio)} — {formatarData(escala.semana_fim)}</td>
                  <td style={{ padding: "10px" }}>PUBLICADA</td>
                  <td style={{ padding: "10px" }}>{formatarDataHora(escala.published_at)}</td>
                  <td style={{ padding: "10px" }}>{nomesUtilizadores[String(escala.published_by)] || "Utilizador"}</td>
                  <td style={{ padding: "10px", display: "flex", gap: 8 }}>
                    <Button type="button" variant="secondary" onClick={() => verEscala(escala)}>Ver</Button>
                    <Button type="button" variant="secondary" loading={sendingKey === `servico:${escala.id}`} onClick={() => enviarEmail(escala.id, "servico", "Escala")}>Enviar por email</Button>
                    {lastEmailSentAt[`servico:${escala.id}`] ? <small>Último envio: {formatarDataHora(lastEmailSentAt[`servico:${escala.id}`])}</small> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card style={{ padding: theme.spacing.md, border: `1px solid ${theme.colors.border}` }}>
        <h3 style={{ marginTop: 0 }}>Plantões</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={{ textAlign: "left", padding: "8px 10px" }}>Período</th><th style={{ textAlign: "left", padding: "8px 10px" }}>Estado</th><th style={{ textAlign: "left", padding: "8px 10px" }}>Publicado em</th><th style={{ textAlign: "left", padding: "8px 10px" }}>Publicado por</th><th style={{ textAlign: "left", padding: "8px 10px" }}>Ações</th></tr></thead>
            <tbody>{plantoes.length === 0 ? <tr><td colSpan="5" style={{ padding: "10px", color: theme.colors.muted }}>Sem plantões publicados.</td></tr> : plantoes.map((plantao) => (
              <tr key={plantao.escala_id}>
                <td style={{ padding: "10px" }}>{formatarData(plantao.periodo_inicio)} — {formatarData(plantao.periodo_fim)}</td>
                <td style={{ padding: "10px" }}>PUBLICADO</td>
                <td style={{ padding: "10px" }}>{formatarDataHora(plantao.published_at)}</td>
                <td style={{ padding: "10px" }}>{nomesUtilizadores[String(plantao.published_by)] || "Utilizador"}</td>
                <td style={{ padding: "10px", display: "flex", gap: 8, alignItems: "center" }}><Button type="button" variant="secondary" onClick={() => verPlantao(plantao)}>Ver</Button><Button type="button" variant="secondary" loading={sendingKey === `plantao:${plantao.escala_id}`} onClick={() => enviarEmail(plantao.escala_id, "plantao", "Plantão")}>Enviar por email</Button>{lastEmailSentAt[`plantao:${plantao.escala_id}`] ? <small>Último envio: {formatarDataHora(lastEmailSentAt[`plantao:${plantao.escala_id}`])}</small> : null}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>

      {escalaSelecionada ? (
        <Card style={{ padding: theme.spacing.md, border: `1px solid ${theme.colors.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: theme.spacing.sm, alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0 }}>Escala publicada</h3>
              <p style={{ margin: "4px 0 0", color: theme.colors.muted }}>
                {formatarData(escalaSelecionada.semana_inicio)} — {formatarData(escalaSelecionada.semana_fim)} · Publicada em {formatarDataHora(escalaSelecionada.published_at)} · {nomesUtilizadores[String(escalaSelecionada.published_by)] || "Utilizador"}
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={() => setEscalaSelecionada(null)}>Fechar</Button>
          </div>
          <div style={{ overflowX: "auto", marginTop: theme.spacing.md }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={{ textAlign: "left", padding: "8px 10px" }}>Dia</th><th style={{ textAlign: "left", padding: "8px 10px" }}>Manhã</th><th style={{ textAlign: "left", padding: "8px 10px" }}>Tarde</th></tr></thead>
              <tbody>
                {linhasPorDia(escalaSelecionada.escalas_servico_linhas).map((linha) => (
                  <tr key={linha.dia}>
                    <td style={{ padding: "10px", fontWeight: 600 }}>{linha.dia}</td>
                    <td style={{ padding: "10px" }}>{linha.manha ? linha.manha.titulo || nomesUtilizadores[String(linha.manha.usuario_id)] || "Comercial" : "—"}</td>
                    <td style={{ padding: "10px" }}>{linha.tarde ? linha.tarde.titulo || nomesUtilizadores[String(linha.tarde.usuario_id)] || "Comercial" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {plantaoSelecionado ? (
        <Card style={{ padding: theme.spacing.md, border: `1px solid ${theme.colors.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: theme.spacing.sm, alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0 }}>Plantão publicado</h3>
              <p style={{ margin: "4px 0 0", color: theme.colors.muted }}>{formatarData(plantaoSelecionado.periodo_inicio)} — {formatarData(plantaoSelecionado.periodo_fim)} · Publicado em {formatarDataHora(plantaoSelecionado.published_at)} · {nomesUtilizadores[String(plantaoSelecionado.published_by)] || "Utilizador"}</p>
            </div>
            <Button type="button" variant="secondary" onClick={() => setPlantaoSelecionado(null)}>Fechar</Button>
          </div>
          <div style={{ display: "grid", gap: 8, marginTop: theme.spacing.md }}>
            {(plantaoSelecionado.linhas || []).map((linha) => (
              <div key={linha.data} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8 }}>
                <strong>{formatarData(linha.data)}</strong>
                <span>{nomesUtilizadores[String(linha.usuario_id)] || "Comercial"}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
