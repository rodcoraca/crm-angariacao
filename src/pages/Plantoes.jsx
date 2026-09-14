import { useCallback, useEffect, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useAuthContext } from "../modules/auth/context";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { notifyError, notifySuccess } from "../components/ui/feedbackBus";
import { listarUsuarios } from "../modules/users/services";
import {
  listarEscalaPlantaoPorPeriodo,
  publicarEscalaPlantao,
  substituirEscalaPlantao,
} from "../modules/servicos/services";

function isUsuarioAtivo(usuario) {
  if (!usuario) return false;
  if (usuario.ativo === false || usuario.active === false) return false;
  const accountStatus = String(usuario.account_status || "").trim().toLowerCase();
  return accountStatus !== "disabled" && accountStatus !== "inactive";
}

function getNomeCompleto(usuario) {
  const parts = [usuario?.nome, usuario?.apelido].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return usuario?.username || usuario?.email || "Utilizador";
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizarSabado(value) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return toIsoDate(new Date());
  const diff = (date.getUTCDay() + 1) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return toIsoDate(date);
}

function adicionarSabados(dataInicio, quantidade) {
  const inicio = new Date(`${dataInicio}T00:00:00Z`);
  inicio.setUTCDate(inicio.getUTCDate() + (quantidade - 1) * 7);
  return toIsoDate(inicio);
}

function listarSabados(dataInicio, dataFim) {
  const inicio = new Date(`${dataInicio}T00:00:00Z`);
  const fim = new Date(`${dataFim}T00:00:00Z`);
  const sabados = [];
  for (const cursor = new Date(inicio); cursor <= fim; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    sabados.push(toIsoDate(cursor));
  }
  return sabados;
}

function formatarData(value) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

export default function Plantoes() {
  const theme = useTheme();
  const { user } = useAuthContext();
  const defaultStart = normalizarSabado(new Date().toISOString().slice(0, 10));
  const [periodoInicio, setPeriodoInicio] = useState(defaultStart);
  const [periodoFim, setPeriodoFim] = useState(adicionarSabados(defaultStart, 4));
  const [usuariosEmpresa, setUsuariosEmpresa] = useState([]);
  const [participacaoLocal, setParticipacaoLocal] = useState({});
  const [escala, setEscala] = useState(null);
  const [linhas, setLinhas] = useState([]);

  const carregarUsuarios = useCallback(async () => {
    const { data, error } = await listarUsuarios({ currentUser: user });
    if (error) {
      notifyError(error.message || "Não foi possível carregar os utilizadores da empresa.");
      return;
    }
    setUsuariosEmpresa((data || []).filter(isUsuarioAtivo));
  }, [user]);

  const carregarEscala = useCallback(async () => {
    const result = await listarEscalaPlantaoPorPeriodo({ user, periodoInicio, periodoFim });
    if (result.error) {
      notifyError(result.error.message || "Não foi possível carregar o plantão.");
      return;
    }
    setEscala(result.data);
    const nomes = new Map(usuariosEmpresa.map((usuario) => [String(usuario.id), getNomeCompleto(usuario)]));
    setLinhas((result.data?.linhas || []).map((linha) => ({ ...linha, nome: nomes.get(String(linha.usuario_id)) || linha.nome || "Comercial" })));
  }, [periodoFim, periodoInicio, user, usuariosEmpresa]);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  useEffect(() => {
    carregarEscala();
  }, [carregarEscala]);

  const sabados = listarSabados(periodoInicio, periodoFim);
  const participantes = usuariosEmpresa.filter((usuario) => participacaoLocal[String(usuario.id)]);
  const publicada = escala?.escala_estado === "publicada";

  function alterarInicio(event) {
    const inicio = normalizarSabado(event.target.value);
    setPeriodoInicio(inicio);
    if (new Date(`${periodoFim}T00:00:00Z`) < new Date(`${inicio}T00:00:00Z`)) {
      setPeriodoFim(adicionarSabados(inicio, 4));
    }
    setEscala(null);
    setLinhas([]);
  }

  function alterarFim(event) {
    const fim = normalizarSabado(event.target.value);
    const minimo = adicionarSabados(periodoInicio, 4);
    setPeriodoFim(new Date(`${fim}T00:00:00Z`) < new Date(`${minimo}T00:00:00Z`) ? minimo : fim);
  }

  function alternarParticipacao(usuario) {
    if (publicada) return;
    const usuarioId = String(usuario.id);
    setParticipacaoLocal((prev) => ({ ...prev, [usuarioId]: !prev[usuarioId] }));
  }

  function escolherComercial(data, usuarioId) {
    const usuario = usuariosEmpresa.find((item) => String(item.id) === String(usuarioId));
    if (!usuario || publicada) return;
    setLinhas((prev) => prev.map((linha) => (
      linha.data === data ? { ...linha, usuario_id: usuario.id, nome: getNomeCompleto(usuario) } : linha
    )));
  }

  const guardarLinhas = useCallback(async (linhasParaGuardar = linhas) => {
    const validas = linhasParaGuardar.filter((linha) => linha.usuario_id && sabados.includes(linha.data));
    if (validas.length < 4 || validas.length !== sabados.length) {
      notifyError("Cada sábado do período precisa de um comercial.");
      return null;
    }
    const result = await substituirEscalaPlantao({
      user,
      periodoInicio,
      periodoFim,
      linhas: validas.map((linha) => ({ data: linha.data, usuario_id: linha.usuario_id })),
    });
    if (result.error) {
      notifyError(result.error.message || "Não foi possível guardar o plantão.");
      return null;
    }
    await carregarEscala();
    return result.data;
  }, [carregarEscala, linhas, periodoFim, periodoInicio, sabados, user]);

  async function gerarPlantao() {
    if (sabados.length < 4) {
      notifyError("O período deve conter pelo menos 4 sábados.");
      return;
    }
    if (participantes.length === 0) {
      notifyError('Selecione pelo menos um Comercial em "Participa".');
      return;
    }

    const contagem = {};
    let anterior = null;
    const geradas = sabados.map((data) => {
      const candidatos = participantes.filter((usuario) => String(usuario.id) !== String(anterior)) || participantes;
      const ordenados = candidatos
        .map((usuario) => ({ usuario, total: contagem[String(usuario.id)] || 0 }))
        .sort((a, b) => a.total - b.total || Math.random() - 0.5);
      const escolhido = (ordenados[0] || { usuario: participantes[0] }).usuario;
      contagem[String(escolhido.id)] = (contagem[String(escolhido.id)] || 0) + 1;
      anterior = escolhido.id;
      return { data, usuario_id: escolhido.id, nome: getNomeCompleto(escolhido) };
    });

    const escalaId = await guardarLinhas(geradas);
    if (escalaId) notifySuccess("Plantão gerado como rascunho.");
  }

  async function publicar() {
    if (!escala?.escala_id) return;
    const result = await publicarEscalaPlantao({ user, escalaId: escala.escala_id });
    if (result.error) {
      notifyError(result.error.message || "Não foi possível publicar o plantão.");
      return;
    }
    await carregarEscala();
    notifySuccess("Plantão publicado com sucesso.");
  }

  return (
    <div style={{ display: "grid", gap: theme.spacing.md }}>
      <div>
        <h2 style={{ margin: 0 }}>Plantão</h2>
        <p style={{ margin: "4px 0 0", color: theme.colors.muted }}>Escala de sábados</p>
      </div>

      <Card style={{ padding: theme.spacing.md, border: `1px solid ${theme.colors.border}` }}>
        <h3 style={{ marginTop: 0 }}>Período</h3>
        <div style={{ display: "flex", gap: theme.spacing.sm, flexWrap: "wrap" }}>
          <label>Primeiro sábado<input type="date" value={periodoInicio} onChange={alterarInicio} disabled={publicada} /></label>
          <label>Último sábado<input type="date" value={periodoFim} onChange={alterarFim} disabled={publicada} /></label>
        </div>
        <div style={{ marginTop: theme.spacing.sm, color: theme.colors.muted }}>{formatarData(periodoInicio)} — {formatarData(periodoFim)} · {sabados.length} sábados</div>
      </Card>

      <Card style={{ padding: theme.spacing.md, border: `1px solid ${theme.colors.border}` }}>
        <h3 style={{ marginTop: 0 }}>Comerciais</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={{ textAlign: "left", padding: "8px" }}>Comercial</th><th style={{ textAlign: "left", padding: "8px" }}>Participa</th></tr></thead>
          <tbody>{usuariosEmpresa.map((usuario) => (
            <tr key={usuario.id}>
              <td style={{ padding: "8px" }}>{getNomeCompleto(usuario)}</td>
              <td style={{ padding: "8px" }}><input type="checkbox" checked={Boolean(participacaoLocal[String(usuario.id)])} onChange={() => alternarParticipacao(usuario)} disabled={publicada} /></td>
            </tr>
          ))}</tbody>
        </table>
      </Card>

      <Card style={{ padding: theme.spacing.md, border: `1px solid ${theme.colors.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: theme.spacing.sm, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Plantão</h3>
          <div style={{ display: "flex", gap: theme.spacing.xs }}>
            {!publicada ? <Button type="button" variant="primary" onClick={gerarPlantao}>Gerar plantão</Button> : null}
            {!publicada && escala ? <Button type="button" variant="secondary" onClick={() => guardarLinhas()}>Guardar alterações</Button> : null}
            {!publicada && escala ? <Button type="button" variant="primary" onClick={publicar}>Publicar plantão</Button> : null}
          </div>
        </div>
        {escala ? <div style={{ marginTop: theme.spacing.sm, color: publicada ? theme.colors.success : theme.colors.muted, fontWeight: 600 }}>{publicada ? "PUBLICADO — NÃO EDITÁVEL" : "RASCUNHO EDITÁVEL"}</div> : null}
        {linhas.length === 0 ? <p style={{ color: theme.colors.muted }}>Ainda não existe plantão para este período.</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: theme.spacing.md }}>
            <thead><tr><th style={{ textAlign: "left", padding: "8px" }}>Sábado</th><th style={{ textAlign: "left", padding: "8px" }}>Comercial</th></tr></thead>
            <tbody>{linhas.map((linha) => (
              <tr key={linha.data}>
                <td style={{ padding: "8px" }}>{formatarData(linha.data)}</td>
                <td style={{ padding: "8px" }}>{publicada ? (linha.nome || "Comercial") : <select value={linha.usuario_id || ""} onChange={(event) => escolherComercial(linha.data, event.target.value)}><option value="">Selecionar comercial</option>{usuariosEmpresa.map((usuario) => <option key={usuario.id} value={usuario.id}>{getNomeCompleto(usuario)}</option>)}</select>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
