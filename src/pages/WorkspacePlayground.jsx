import { useState } from "react";
import { Button, Card, Workspace } from "../components/ui";

export default function WorkspacePlayground() {
  const [open, setOpen] = useState(false);

  return (
    <Card title="Workspace Playground">
      <Button onClick={() => setOpen(true)}>
        Abrir Workspace
      </Button>

      <Workspace
        open={open}
        title="Workspace de Teste"
        onClose={() => setOpen(false)}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>

            <Button>
              Guardar
            </Button>
          </div>
        }
      >
        <p>Primeiro teste do Workspace.</p>

        {Array.from({ length: 80 }).map((_, i) => (
          <p key={i}>Linha {i + 1}</p>
        ))}
      </Workspace>
    </Card>
  );
}