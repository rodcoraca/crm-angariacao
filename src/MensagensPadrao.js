export default function MensagensPadrao({ voltar }) {

  const mensagens = [
    {
      titulo: "📞 Primeiro Contacto",
      texto:
        "Boa tarde, Sr.(a) {{nome}}. Tentámos contacto relativamente ao seu imóvel e gostaríamos de perceber se continua disponível para venda."
    },

    {
      titulo: "🏡 Imóvel identificado",
      texto:
        "Verificámos o seu imóvel e acreditamos existir potencial para apresentar compradores qualificados. Gostaríamos de lhe apresentar a nossa metodologia de trabalho."
    },

    {
      titulo: "🔥 Lead Quente",
      texto:
        "Confirmamos a nossa reunião agendada para {{data}} às {{hora}}. Será um prazer apresentar a nossa estratégia comercial."
    },

    {
      titulo: "🟡 Follow-up",
      texto:
        "Retomamos o contacto apenas para perceber se a venda do imóvel continua nos seus planos."
    },

    {
      titulo: "❄️ Encerramento Elegante",
      texto:
        "Agradecemos o seu tempo e disponibilidade. Caso no futuro pretenda reavaliar a situação do imóvel, estaremos inteiramente disponíveis."
    },

    {
      titulo: "💰 Objeção Comissão",
      texto:
        "Compreendo perfeitamente a sua preocupação. O nosso objetivo é gerar valorização, segurança e reduzir o tempo de venda."
    },

    {
      titulo: "🏢 Já trabalha com imobiliária",
      texto:
        "Compreendo perfeitamente. Mesmo assim, acreditamos que uma segunda visão estratégica poderá acrescentar valor ao processo."
    },

    {
      titulo: "📲 WhatsApp Resposta Rápida",
      texto:
        "Obrigado pelo seu contacto. Assim que possível iremos responder com toda a atenção."
    }
  ];

  function copiarTexto(texto) {
    navigator.clipboard.writeText(texto);
    alert("Mensagem copiada!");
  }

  return (
    <div style={container}>
      <button
        style={btnVoltar}
        onClick={voltar}
      >
        ↩️ Voltar  
      </button>
      <h2 style={titulo}>
        📩 Mensagens Padrão
      </h2>

      <div style={grid}>

        {mensagens.map((msg, index) => (
          <div key={index} style={card}>

            <h3 style={cardTitulo}>
              {msg.titulo}
            </h3>

            <div style={texto}>
              {msg.texto}
            </div>

            <button
              style={botao}
              onClick={() => copiarTexto(msg.texto)}
            >
              📋 Copiar
            </button>

          </div>
        ))}

      </div>

    </div>
  );
}

//////////////////////////////////////////////////////
// 🎨 ESTILOS

const container = {
  padding: "10px"
};

const titulo = {
  marginBottom: "20px",
  color: "#1e293b"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "20px"
};

const card = {
  background: "white",
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 5px 15px rgba(0,0,0,0.06)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between"
};

const cardTitulo = {
  marginBottom: "15px",
  color: "#0f172a",
  fontSize: "16px"
};

const texto = {
  background: "#f8fafc",
  padding: "15px",
  borderRadius: "8px",
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#334155",
  marginBottom: "15px",
  whiteSpace: "pre-line"
};

const botao = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600"
};

const btnVoltar = {
  border: "none",
  padding: "10px 14px",
  borderRadius: "8px",
  cursor: "pointer",
  marginBottom: "15px",
  fontWeight: "600"
};