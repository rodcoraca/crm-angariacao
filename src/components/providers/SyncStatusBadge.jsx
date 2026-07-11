import { useEffect, useState } from "react";
import { syncState, syncProviders } from "../../services/providers/providerSyncService";
import Button from "../ui/Button";

export default function SyncStatusBadge() {
  const [status, setStatus] = useState(syncState);

  useEffect(() => {
    const interval = setInterval(() => setStatus({ ...syncState }), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    await syncProviders();
    setStatus({ ...syncState });
  };

  return (
    <div style={{ padding: '15px', border: '1px solid var(--os-color-border)', borderRadius: '8px', marginBottom: '20px' }}>
      <p><strong>Última sincronização:</strong> {status.lastSyncAt ? status.lastSyncAt.toLocaleString() : 'Nunca'}</p>
      <p><strong>Próxima:</strong> {status.nextSyncAt ? status.nextSyncAt.toLocaleString() : 'Aguardando'}</p>
      <p><strong>Estado:</strong> {status.status}</p>
      <Button onClick={handleSync} disabled={status.status === 'running'}>Sincronizar Agora</Button>
    </div>
  );
}
