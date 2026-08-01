import { Button, Card, Workspace } from "../ui";

export default function RadarSyncWorkspace({
  open,
  onClose,
  status = "running",
  provider = "Imovirtual",
  summary = {}
}) {
  const {
    novas = 0,
    atualizadas = 0,
    expiradas = 0,
    ignoradas = 0
  } = summary;

  const statusConfig = {
    starting: {
      title: "A iniciar sincronização...",
      icon: "⏳"
    },
    running: {
      title: "Atualizando oportunidades...",
      icon: "🔄"
    },
    success: {
      title: "Sincronização concluída",
      icon: "✅"
    },
    error: {
      title: "Falha na sincronização",
      icon: "❌"
    },
    blocked: {
      title: "Atualização indisponível",
      icon: "⏱️"
}
  };

  const current = statusConfig[status] || statusConfig.running;

  return (
    <Workspace
      open={open}
      title="Atualização do Radar"
      subtitle={provider}
      onClose={onClose}
      footer={null}
    >
      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24
          }}
        >
          <div style={{ fontSize: 32 }}>
            {current.icon}
          </div>

          <div>
            <h3 style={{ margin: 0 }}>
              {current.title}
            </h3>

            <div
              style={{
                marginTop: 4,
                opacity: 0.7
              }}
            >
              Provider: {provider}
            </div>
          </div>
        </div>

        <Card title="Resumo">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(180px,1fr))",
              gap: 16
            }}
          >
            <div>
              <strong>Novas</strong>
              <div>{novas}</div>
            </div>

            <div>
              <strong>Atualizadas</strong>
              <div>{atualizadas}</div>
            </div>

            <div>
              <strong>Expiradas</strong>
              <div>{expiradas}</div>
            </div>

            <div>
              <strong>Ignoradas</strong>
              <div>{ignoradas}</div>
            </div>
          </div>
        </Card>

        {status === "running" && (
          <Card title="Processamento">
            <div>✓ Ligação ao provider estabelecida</div>
            <div>✓ A obter oportunidades</div>
            <div>⏳ A comparar alterações</div>
            <div>⏳ A atualizar base de dados</div>
          </Card>
        )}

        {status === "success" && (
          <Card title="Resultado">
            A atualização terminou com sucesso.
          </Card>
        )}

        {status === "error" && (
          <Card title="Erro">
            Ocorreu um erro durante a sincronização.
          </Card>
        )}
      </Card>
    </Workspace>
  );
}