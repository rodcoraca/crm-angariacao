import { useEffect, useRef } from "react";
import { clearPersistentToast, notify } from "../../components/ui/feedbackBus";

export const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const PENDING_UPDATE_VERSION_KEY = "osflow:pending-update-version";
const UPDATE_PERSISTENT_TOAST_ID = "osflow:update-available";

function readVersion(payload) {
  const version = payload?.version;
  return typeof version === "string" && version.trim() ? version.trim() : null;
}

function readPendingUpdateVersion() {
  try {
    return window.localStorage.getItem(PENDING_UPDATE_VERSION_KEY);
  } catch {
    return null;
  }
}

function clearPendingUpdateVersion() {
  try {
    window.localStorage.removeItem(PENDING_UPDATE_VERSION_KEY);
  } catch {
    // A indisponibilidade do armazenamento não impede a verificação da versão.
  }
}

function readLoadedVersion() {
  if (typeof document === "undefined") return null;
  const versionMeta = document.querySelector('meta[name="osflow-version"]');
  return readVersion({ version: versionMeta?.getAttribute("content") });
}

function writePendingUpdateVersion(version) {
  try {
    window.localStorage.setItem(PENDING_UPDATE_VERSION_KEY, version);
  } catch {
    // A indisponibilidade do armazenamento não impede a verificação da versão.
  }
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

        const loadedVersion = readLoadedVersion();
        const currentLoadedVersion = loadedVersion || initialVersionRef.current || remoteVersion;
        let pendingUpdateVersion = readPendingUpdateVersion();
        let updateConfirmed = false;

        if (pendingUpdateVersion && loadedVersion && loadedVersion === remoteVersion) {
          clearPendingUpdateVersion();
          clearPersistentToast(UPDATE_PERSISTENT_TOAST_ID);
          pendingUpdateVersion = null;
          updateConfirmed = true;
          updateNotifiedRef.current = false;
        }

        if (initialVersionRef.current === null) {
          initialVersionRef.current = currentLoadedVersion;
          if (pendingUpdateVersion && !updateConfirmed) {
            notifyUpdate();
          }
        }

        if (!loadedVersion && pendingUpdateVersion && pendingUpdateVersion !== remoteVersion) {
          writePendingUpdateVersion(remoteVersion);
          notifyUpdate();
          return;
        }

        if (remoteVersion !== currentLoadedVersion) {
          if (pendingUpdateVersion !== remoteVersion) {
            writePendingUpdateVersion(remoteVersion);
          }
          notifyUpdate();
        }
      } catch {
        // A falha de rede não deve ser tratada como atualização disponível.
      } finally {
        requestInFlightRef.current = false;
      }
    }

    function notifyUpdate() {
      if (updateNotifiedRef.current) return;
      updateNotifiedRef.current = true;
      notify({
        message: "Está disponível uma nova versão do OSFlow.",
        actionLabel: "Atualizar",
        onAction: () => window.location.reload(),
        persistent: true,
        persistentId: UPDATE_PERSISTENT_TOAST_ID
      });
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
