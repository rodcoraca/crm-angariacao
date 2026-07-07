import { criarOpcoesFluxoOrigemLead, formatarOrigemComCatalogo } from "./leadOrigins";

export function formatarOrigemLead(origem) {
  return formatarOrigemComCatalogo(origem);
}

export function obterEmojiOrigem(origem) {
  if (origem === "placa") return "🏠";
  if (origem === "indicacao") return "🤝";
  if (origem === "site") return "🌐";
  return "📍";
}

export function obterScriptInicial(origem) {
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

export function criarFluxoLeads(origem, qualificacaoVeioDaObjecao) {
  return {
    origem: {
      pergunta: "Qual a origem do contacto?",
      script: "Escolha a origem inicial para seguir o guião.",
      opcoes: criarOpcoesFluxoOrigemLead()
    },
    dados: {
      pergunta: "Dados do proprietário",
      script: "Registe o nome e o telefone antes de avançar.",
      opcoes: [{ texto: "Continuar", next: "inicio" }]
    },
    inicio: {
      pergunta: "Introdução",
      script: obterScriptInicial(origem),
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
}
