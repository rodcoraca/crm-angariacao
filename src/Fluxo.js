import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Fluxo({ user }) {

  const [etapa, setEtapa] = useState("origem");
  const [historico, setHistorico] = useState([]);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [origem, setOrigem] = useState("");
  const [observacao, setObservacao] = useState("");
  const [mostrarObs, setMostrarObs] = useState(false);
  const [qualificacaoVeioDaObjecao, setQualificacaoVeioDaObjecao] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState("");
  const [leadSelecionadoId, setLeadSelecionadoId] = useState(null);

  useEffect(() => {
  const lead = localStorage.getItem("leadSelecionado");

  if (lead) {
    const l = JSON.parse(lead);

    // 🔥 reset
    setHistorico([]);
    setMostrarObs(false);

    // 🔥 dados
    setNome(l.nome);
    setTelefone(l.telefone);
    setOrigem(l.origem);
    setObservacao(l.observacoes || "");

    // 🔥 IR PARA LISTA (NÃO PARA SCRIPT)
    setEtapa("lista");

    // 🔥 guardar tipo para destacar
    setTipoSelecionado(l.tipo);
    setLeadSelecionadoId(l.id);

    localStorage.removeItem("leadSelecionado");
  }
}, []);

  function formatarOrigem(origem) {
    if (origem === "placa") return "Placa na rua";
    if (origem === "indicacao") return "Indicação";
    if (origem === "site") return "Site de imóveis";
    return origem;
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
      return "Seu contato foi me dado por XXXX. " + base;
    }

    if (origem === "site") {
      return "Vi seu anúncio no website. (Citar qual website e dados do anúncio) " + base;
    }

    return base;
  }

  const fluxo = {
    origem: {
      pergunta: "Qual a origem do contacto?",
      script: "Selecione a origem do lead",
      opcoes: [
        { texto: "Girafada | Porta à Porta | Abordagem Física", next: "dados", origem: "placa" },
        { texto: "Indicação", next: "dados", origem: "indicacao" },
        { texto: "Site de imóveis", next: "dados", origem: "site" }
      ]
    },

    dados: {
      pergunta: "Dados do proprietário",
      script: "Informe nome e telefone",
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
      script: "Posso perguntar o motivo?",
      opcoes: [
        { texto: "Aceita conversar", next: "qualificacao" },
        { texto: "Recusa", next: "lead_frio" }
      ]
    },

    qualificacao: {
      pergunta: "Qualificação",
      script: "Perguntar/Confirmar sobre informações do imóvel.\n\nApartamento/Moradia: Área bruta, Área útil, Garagem, Varanda, Tipologa e Piso.\nTerreno: Área bruta, Área de construção, PIP, Projeto Aprovado e Licenças.\nLoja/Armazém: Área bruta, Área útil, Garagem e Licenças",
      opcoes: qualificacaoVeioDaObjecao
        ? [{ texto: "Gravar Lead", next: "lead_morno" }]
        : [{ texto: "Avançar", next: "fecho" }]
    },

    fecho: {
      pergunta: "Agendamento",
      script: "Sugerir duas datas prómixas com horários.",
      opcoes: [{ texto: "Agendado", next: "lead_quente" }]
    },

    lead_quente: { tipo: "quente" },
    lead_morno: { tipo: "morno" },
    lead_frio: { tipo: "frio", pedirObs: true }
  };

  const node = fluxo[etapa];

  if (!node) return null;

  function handleClick(proximo, origemSelecionada) {
    	if (origemSelecionada) {
        setOrigem(origemSelecionada);
  }

  setHistorico(prev => {
  if (etapa === "origem") return []; // 👈 reset aqui também
  return [...prev, etapa];
});

  if (proximo === "qualificacao") {
    setQualificacaoVeioDaObjecao(etapa === "objecao");
  }

  const proximoNode = fluxo[proximo];

  // 👉 guarda histórico corretamente
  setHistorico(prev => [...prev, etapa]);

  if (proximoNode.tipo === "frio" && proximoNode.pedirObs) {
    setMostrarObs(true);
    return;
  }

  if (proximoNode.tipo) {
    salvarLead(proximoNode.tipo);
    return;
  }

  setEtapa(proximo);
}

function voltar() {

  if (historico.length === 0) return;

  const novoHistorico = [...historico];
  const ultima = novoHistorico.pop();

  // 👇 SE VOLTAR PARA ORIGEM → LIMPA TUDO
  if (ultima === "origem") {
    setHistorico([]);
    setNome("");
    setTelefone("");
    setOrigem("");
  }

  setHistorico(novoHistorico);
  setMostrarObs(false);
  setEtapa(ultima);
}

  async function salvarLead(tipo) {

    const { error } = await supabase.from("leads").insert([
      {
        nome,
        telefone,
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
    } else {
      alert("Lead guardado!");

      setEtapa("origem");
      setHistorico([]);
      setNome("");
      setTelefone("");
      setOrigem("");
      setObservacao("");
      setMostrarObs(false);
      setQualificacaoVeioDaObjecao(false);
    }
  }

  // 🔴 OBSERVAÇÃO
  if (mostrarObs) {
    return (
      <div style={box}>

        {historico.length > 0 && (
          <button style={btnVoltarTop} onClick={voltar}>
            ↩️
          </button>
        )}

        {origem && (
          <div style={origemBox}>
            📍 Origem: <strong>{formatarOrigem(origem)}</strong>
          </div>
        )}

        <h2>Motivo da recusa</h2>

        <textarea
          style={textarea}
          placeholder="Adicionar motivo da recusa..."
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />

        <button style={btn} onClick={() => salvarLead("frio")}>
          Guardar Lead
        </button>

      </div>
    );
  }

  // 🟢 UI PRINCIPAL
  return (
    <div style={box}>

      {historico.length > 0 && (
        <button style={btnVoltarTop} onClick={voltar}>
          ↩️
        </button>
      )}

      {origem && (
        <div style={origemBox}>
          📍 Origem: <strong>{formatarOrigem(origem)}</strong>
        </div>
      )}

      <h2>{node.pergunta}</h2>

      <div style={scriptBox}>
        {node.script}
      </div>

      {etapa === "qualificacao" && (
        <textarea
          style={textarea}
          placeholder="Adicionar observações relevantes..."
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      )}

      {etapa === "dados" && (
        <>
          <input
            style={input}
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <input
            style={input}
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </>
      )}

      {etapa === "origem" ? (
  <div style={gridCards}>
    {node.opcoes.map(op => (
      <div
        key={op.texto}
        style={cardOrigem}
        onClick={() => handleClick(op.next, op.origem)}
      >
        <div style={emojiCard}>
          {getEmojiOrigem(op.origem)}
        </div>
        <strong>{op.texto}</strong>
      </div>
    ))}
  </div>
) : (
  node.opcoes && node.opcoes.map(op => (
    <button
      key={op.texto}
      style={btn}
      onClick={() => handleClick(op.next, op.origem)}
    >
      {op.texto}
    </button>
  ))
)}

    </div>
  );
}
//////////////////////////////////////////////////////
// 🎨 ESTILOS

const gridCards = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "15px",
  marginTop: "15px"
};

const cardOrigem = {
  padding: "20px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  textAlign: "center",
  cursor: "pointer",
  transition: "0.2s",
  boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
};

const emojiCard = {
  fontSize: "28px",
  marginBottom: "10px"
};

const box = {
  position: "relative",
  background: "white",
  padding: "60px 25px 25px 25px", // 👈 aumentei
  borderRadius: "10px",
  boxShadow: "0 5px 15px rgba(0,0,0,0.1)"
};

const scriptBox = {
  background: "#eef2ff",
  padding: "15px",
  borderRadius: "8px",
  marginBottom: "15px",
  lineHeight: "1.6",
  whiteSpace: "pre-line"
};
const input = {
  width: "100%",
  padding: "10px",
  marginBottom: "10px"
};

const btn = {
  width: "100%",
  padding: "12px",
  marginTop: "10px",
  border: "none",
  borderRadius: "8px",
  background: "#2563eb",
  color: "white",
  cursor: "pointer"
};

const btnVoltar = {
  width: "100%",
  padding: "10px",
  marginTop: "10px",
  background: "#64748b",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer"
};

const btnVoltarTop = {
  position: "absolute",
  top: "15px",
  left: "15px",
  zIndex: 10, // 👈 importante
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  padding: "6px",
  fontSize: "18px",
  cursor: "pointer"
};

const origemBox = {
  fontSize: "13px",
  color: "#475569",
  marginBottom: "10px",
  background: "#f1f5f9",
  padding: "6px 10px",
  borderRadius: "6px"
};

const textarea = {
  width: "100%",
  height: "80px",
  resize: "none",
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  boxSizing: "border-box",
  marginBottom: "10px"
};