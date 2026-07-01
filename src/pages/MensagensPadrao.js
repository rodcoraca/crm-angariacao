import { useTheme } from "../theme/ThemeContext";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import Loading from "../components/ui/Loading";

export default function MensagensPadrao({ voltar }) {
  const theme = useTheme();
  const isLoading = false;

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

  if (isLoading) {
    return (
      <div style={container}>
        <Loading label="A carregar mensagens..." />
      </div>
    );
  }

  if (mensagens.length === 0) {
    return (
      <div style={container}>
        <Button
          variant="ghost"
          style={btnVoltar}
          onClick={voltar}
        >
          ↩️ Voltar
        </Button>
        <h2 style={{ ...titulo, color: theme.colors.primary }}>
          📩 Mensagens Padrão
        </h2>
        <EmptyState
          title="Sem mensagens padrão"
          description="Não existem mensagens configuradas de momento."
        />
      </div>
    );
  }

  return (
    <div style={container}>
      <Button
        variant="ghost"
        style={btnVoltar}
        onClick={voltar}
      >
        ↩️ Voltar
      </Button>
      <h2 style={{ ...titulo, color: theme.colors.primary }}>
        📩 Mensagens Padrão
      </h2>

      <div style={grid}>

        {mensagens.map((msg, index) => (
          <Card key={index} style={card}>

            <h3 style={{ ...cardTitulo, color: theme.colors.primary }}>
              <Badge variant="primary">
                {msg.titulo}
              </Badge>
            </h3>

            <div style={{ ...texto, background: theme.colors.surfaceSoft, color: theme.colors.muted }}>
              {msg.texto}
            </div>

            <Button
              variant="secondary"
              style={botao}
              onClick={() => copiarTexto(msg.texto)}
            >
              📋 Copiar
            </Button>

          </Card>
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
  marginBottom: "20px"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "20px"
};

const card = {
  borderRadius: "12px",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between"
};

const cardTitulo = {
  marginBottom: "15px",
  fontSize: "16px"
};

const texto = {
  padding: "15px",
  borderRadius: "8px",
  fontSize: "14px",
  lineHeight: "1.6",
  marginBottom: "15px",
  whiteSpace: "pre-line"
};

const botao = {
  padding: "10px",
  borderRadius: "8px"
};

const btnVoltar = {
  padding: "10px 14px",
  borderRadius: "8px",
  marginBottom: "15px",
  fontWeight: "600"
};