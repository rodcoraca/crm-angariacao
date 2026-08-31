import { useCallback, useEffect, useState } from "react";

const VERSION_URL = "/version.json";
const LOCAL_VERSION_KEY = "osflow_build_version";

async function fetchVersion() {
  const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" }
  });

  if (!response.ok) {
    throw new Error(`Version check failed: ${response.status}`);
  }

  return response.json();
}

export default function PwaUpdatePrompt({ registration }) {
  const [update, setUpdate] = useState(null);

  const checkVersion = useCallback(async () => {
    try {
      const remote = await fetchVersion();
      const current = window.localStorage.getItem(LOCAL_VERSION_KEY);

      if (!current) {
        window.localStorage.setItem(LOCAL_VERSION_KEY, remote.buildId);
        return;
      }

      if (current !== remote.buildId || registration?.waiting) {
        setUpdate(remote);
      }
    } catch (error) {
      if (registration?.waiting) {
        setUpdate({
          app: "OSFlow",
          buildId: "pending-service-worker-update",
          forceUpdate: false
        });
      }
      console.warn("[OSFlow PWA] Version check unavailable", error);
    }
  }, [registration]);

  useEffect(() => {
    checkVersion();

    const interval = window.setInterval(checkVersion, 15 * 60 * 1000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
        registration?.update?.();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [checkVersion, registration]);

  useEffect(() => {
    if (!registration) return undefined;

    const onControllerChange = () => {
      window.location.reload();
    };

    const onUpdateFound = () => {
      const worker = registration.installing;
      if (!worker) return;

      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          checkVersion();
        }
      });
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    registration.addEventListener("updatefound", onUpdateFound);

    if (registration.waiting) {
      checkVersion();
    }

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      registration.removeEventListener("updatefound", onUpdateFound);
    };
  }, [registration, checkVersion]);

  if (!update) return null;

  const applyUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      return;
    }

    if (update.buildId !== "pending-service-worker-update") {
      window.localStorage.setItem(LOCAL_VERSION_KEY, update.buildId);
    }

    window.location.reload();
  };

  const forceUpdate = Boolean(update.forceUpdate);

  return (
    <div
      role={forceUpdate ? "alertdialog" : "status"}
      aria-modal={forceUpdate ? "true" : undefined}
      style={{
        position: "fixed",
        inset: forceUpdate ? 0 : "auto 12px 20px",
        left: forceUpdate ? 0 : "50%",
        transform: forceUpdate ? "none" : "translateX(-50%)",
        zIndex: 3000,
        width: forceUpdate ? "100%" : "min(560px, calc(100vw - 24px))",
        minHeight: forceUpdate ? "100%" : "auto",
        padding: forceUpdate ? "24px" : "14px 16px",
        boxSizing: "border-box",
        background: forceUpdate ? "rgba(13,44,77,.98)" : "#0d2c4d",
        color: "#ffffff",
        boxShadow: "0 12px 32px rgba(0,0,0,.22)",
        display: "flex",
        alignItems: "center",
        justifyContent: forceUpdate ? "center" : "space-between",
        gap: "16px"
      }}
    >
      <div style={{ maxWidth: forceUpdate ? "520px" : "none", textAlign: forceUpdate ? "center" : "left" }}>
        <div style={{ fontWeight: 700, fontSize: forceUpdate ? "22px" : "16px", marginBottom: "6px" }}>
          {forceUpdate ? "Atualização obrigatória" : "Nova versão do OSFlow disponível"}
        </div>
        <div style={{ fontSize: "13px", opacity: 0.9, marginBottom: forceUpdate ? "20px" : 0 }}>
          {forceUpdate
            ? "Foi publicada uma atualização necessária. Atualize agora para continuar a utilizar o OSFlow."
            : "A aplicação foi atualizada. Pode aplicar a nova versão agora."}
        </div>
        <button
          type="button"
          onClick={applyUpdate}
          style={{
            border: 0,
            borderRadius: "8px",
            padding: "9px 14px",
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap"
          }}
        >
          Atualizar agora
        </button>
      </div>
    </div>
  );
}
