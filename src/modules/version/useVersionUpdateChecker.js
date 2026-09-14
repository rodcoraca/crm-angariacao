import { useEffect, useRef } from "react";
import { notify } from "../../components/ui/feedbackBus";

export const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

function readVersion(payload) {
  const version = payload?.version;
  return typeof version === "string" && version.trim() ? version.trim() : null;
}

export default function useVersionUpdateChecker() {
  const initialVersionRef = useRef(null);
  const requestInFlightRef = useRef(false);
  const updateNotifiedRef = useRef(false);

  useEffect(() => {
    let intervalId = null;
    let disposed = false;

    async function checkVersion() {
      if (disposed || document.visibilityState === "hidden" || requestInFlightRef.current) return;

      requestInFlightRef.current = true;
      try {
        const response = await fetch("/version.json", { cache: "no-store" });
        if (!response.ok) return;

        const remoteVersion = readVersion(await response.json());
        if (!remoteVersion || disposed) return;

        if (initialVersionRef.current === null) {
          initialVersionRef.current = remoteVersion;
          return;
        }

        if (remoteVersion !== initialVersionRef.current && !updateNotifiedRef.current) {
          updateNotifiedRef.current = true;
          notify({
            message: "Está disponível uma nova versão do OSFlow.",
            actionLabel: "Atualizar",
            onAction: () => window.location.reload()
          });
        }
      } catch {
        // A falha de rede não deve ser tratada como atualização disponível.
      } finally {
        requestInFlightRef.current = false;
      }
    }

    function stopPolling() {
      if (intervalId === null) return;
      window.clearInterval(intervalId);
      intervalId = null;
    }

    function startPolling() {
      if (disposed || document.visibilityState === "hidden" || intervalId !== null) return;
      intervalId = window.setInterval(checkVersion, VERSION_CHECK_INTERVAL_MS);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        stopPolling();
        return;
      }

      checkVersion();
      startPolling();
    }

    checkVersion();
    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}