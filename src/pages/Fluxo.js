import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { normalizarTelefone, validarTelefone, telefonesCoincidem } from "../telefone";
import { useTheme } from "../theme/ThemeContext";
import Button from "../components/Button";
import Input from "../Input";
import Card from "../components/Card";

export default function Fluxo({ user, onAbrirLead }) {
  const theme = useTheme();
  const [etapa, setEtapa] = useState("origem");
  const [historico, setHistorico] = useState([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [telefoneErro, setTelefoneErro] = useState("");
  const [origem, setOrigem] = useState("");
  const [observacao, setObservacao] = useState("");
  const [mostrarObs, setMostrarObs] = useState(false);
  const [qualificacaoVeioDaObjecao, setQualificacaoVeioDaObjecao] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState("");
  const [leadSelecionadoId, setLeadSelecionadoId] = useState(null);

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

  useEffect(() => {
    const lead = localStorage.getItem("leadSelecionado");

    if (lead) {
      const l = JSON.parse(lead);
      setHistorico([]);
      setMostrarObs(false);
      setNome(l.nome);
      setTelefone(l.telefone);
      setOrigem(l.origem);
      setObservacao(l.observacoes || "");
      setEtapa("lista");
      setTipoSelecionado(l.tipo);
      setLeadSelecionadoId(l.id);
      localStorage.removeItem("leadSelecionado");
    }
  }, []);

  function formatarOrigem(origem) {
    if (origem === "placa") return "Placa na rua";
    if (origem === "indicacao") return "Indicação";
    if (origem === "site") return "Site de imóveis";
    return origem || "Sem origem";
  }

  function getEmojiOrigem(origem) {
    if (origem === "placa") return "🏠";
    if (origem === "indicacao") return "🤝";
    if (origem === "site") return "🌐";
    return "📍";
  }

  function getScriptInicial(origem) {
    const base = "Tem 2 minutos para conversar?";

    if (origem === "placa") {
      return "Soube que seu imóvel está à venda e tenho uma carteira de clientes que podem se interessar. " + base;
    }

    if (origem === "indicacao") {
      return "Seu contato foi me dado por alguém que confia no nosso trabalho. " + base;
    }

    if (origem === "site") {
      return "Vi seu anúncio no website e quero confirmar alguns dados do imóvel. " + base;
    }

    return base;
  }

  const fluxo = {
    origem: {
      pergunta: "Qual a origem do contacto?",
      script: "Escolha a origem inicial para seguir o guião.",
      opcoes: [
        { texto: "Girafada | Porta à Porta | Abordagem Física", next: "dados", origem: "placa" },
        { texto: "Indicação", next: "dados", origem: "indicacao" },
        { texto: "Site de imóveis", next: "dados", origem: "site" }
      ]
    },
    dados: {
      pergunta: "Dados do proprietário",
      script: "Registe o nome e o telefone antes de avançar.",
      opcoes: [{ texto: "Continuar", next: "inicio" }]
    },
    inicio: {
      pergunta: "Introdução",
      script: getScriptInicial(origem),
      opcoes: [
        { texto: "Disponível", next: "qualificacao" },
        { texto: "Sem interesse", next: "objecao" }
      ]
    },
    objecao: {
      pergunta: "Objeção",
      script: "Pergunte o motivo com empatia e registe a resposta.",
      opcoes: [
        { texto: "Aceita conversar", next: "qualificacao" },
        { texto: "Recusa", next: "lead_frio" }
      ]
    },
    qualificacao: {
      pergunta: "Qualificação",
      script: "Confirme detalhes do imóvel: tipologia, áreas, garagem, varanda e piso."
        + "\n\nRegiste apenas o essencial para manter o contacto qualificado.",
      opcoes: qualificacaoVeioDaObjecao
        ? [{ texto: "Gravar Lead", next: "lead_morno" }]
        : [{ texto: "Avançar", next: "fecho" }]
    },
    fecho: {
      pergunta: "Agendamento",
      script: "Sugira duas datas próximas com horários disponíveis.",
      opcoes: [{ texto: "Agendado", next: "lead_quente" }]
    },
    lead_quente: { tipo: "quente" },
    lead_morno: { tipo: "morno" },
    lead_frio: { tipo: "frio", pedirObs: true },
    lista: {
      pergunta: "Lead carregada",
      script: "Esta lead já está disponível. Pode continuar o guião ou iniciar outra tentativa.",
      opcoes: [{ texto: "Continuar", next: "origem" }]
    }
  };

  const node = fluxo[etapa] || fluxo.origem;

  async function handleTelefoneChange(valor) {
    const telefoneNormalizado = normalizarTelefone(valor);
    setTelefone(telefoneNormalizado);

    if (!telefoneNormalizado) {
      setTelefoneErro("");
      return;
    }

    if (!validarTelefone(telefoneNormalizado)) {
      setTelefoneErro("Informe o telefone com 12 dígitos (indicativo + 9 dígitos).\n");
      return;
    }

    setTelefoneErro("");

    const leadExistente = await verificarLeadExistente(telefoneNormalizado);
    if (leadExistente) {
      setTelefoneErro("Este telefone já está cadastrado. A abrir a ficha existente.");
      onAbrirLead?.(leadExistente.id);
    }
  }

  async function verificarLeadExistente(telefoneNormalizado) {
    if (!telefoneNormalizado || !validarTelefone(telefoneNormalizado)) return null;

    const { data, error } = await supabase
      .from("leads")
      .select("id, telefone")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return null;
    }

    return data?.find((lead) => telefonesCoincidem(telefoneNormalizado, lead.telefone)) || null;
  }

  async function handleClick(proximo, origemSelecionada) {
    if (etapa === "dados") {
      const telefoneNormalizado = normalizarTelefone(telefone);
      if (!validarTelefone(telefoneNormalizado)) {
        setTelefone(telefoneNormalizado);
        setTelefoneErro("Informe o telefone com 12 dígitos (indicativo + 9 dígitos).\n");
        alert("Informe o telefone com 12 dígitos (indicativo + 9 dígitos).\n");
        return;
      }

      const leadExistente = await verificarLeadExistente(telefoneNormalizado);
      if (leadExistente) {
        alert("Já existe uma lead com este telefone. A abrir a ficha existente.");
        onAbrirLead?.(leadExistente.id);
        return;
      }
    }

    if (origemSelecionada) {
      setOrigem(origemSelecionada);
    }

    setHistorico((prev) => [...prev, etapa]);

    const proximoNode = fluxo[proximo];
    if (proximoNode?.tipo) {
      if (proximoNode.pedirObs) {
        setMostrarObs(true);
        return;
      }

      salvarLead(proximoNode.tipo);
      return;
    }

    setEtapa(proximo);
  }

  function voltar() {
    if (historico.length === 0) return;

    const novoHistorico = [...historico];
    const ultima = novoHistorico.pop();
    setHistorico(novoHistorico);
    setMostrarObs(false);

    if (ultima === "origem") {
      setOrigem("");
      setNome("");
      setTelefone("");
      setObservacao("");
      setTipoSelecionado("");
      setLeadSelecionadoId(null);
    }

    setEtapa(ultima || "origem");
  }

  async function salvarLead(tipo) {
    const telefoneNormalizado = normalizarTelefone(telefone);

    if (!validarTelefone(telefoneNormalizado)) {
      alert("Informe o telefone com 12 dígitos (indicativo + 9 dígitos).\n");
      return;
    }

    const leadExistente = await verificarLeadExistente(telefoneNormalizado);
    if (leadExistente) {
      alert("Já existe uma lead com este telefone. A abrir a ficha existente.");
      onAbrirLead?.(leadExistente.id);
      return;
    }

    const { error } = await supabase.from("leads").insert([
      {
        nome,
        telefone: telefoneNormalizado,
        tipo,
        origem,
        observacoes: observacao,
        agente_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Lead guardada!");
    setEtapa("origem");
    setHistorico([]);
    setNome("");
    setTelefone("");
    setTelefoneErro("");
    setOrigem("");
    setObservacao("");
    setMostrarObs(false);
    setQualificacaoVeioDaObjecao(false);
    setTipoSelecionado("");
    setLeadSelecionadoId(null);
  }

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
          📍 Origem: <strong>{formatarOrigem(origem)}</strong>
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
              <div style={styles.optionEmoji}>{getEmojiOrigem(op.origem)}</div>
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
