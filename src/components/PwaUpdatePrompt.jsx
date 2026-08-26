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

      if (current !== remote.buildId) {
        setUpdate(remote);
      }
    } catch (error) {
      console.warn("[OSFlow PWA] Version check unavailable", error);
    }
  }, []);

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

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, [registration]);

  if (!update) return null;

  const applyUpdate = async () => {
    window.localStorage.setItem(LOCAL_VERSION_KEY, update.buildId);

    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      return;
    }

    window.location.reload();
  };

  const forceUpdate = Boolean(update.forceUpdate);

  return (
    <div
      role={forceUpdate ? "alert" : "status"}
      style={{
        position: "fixed",
        left: "50%",
        bottom: "20px",
        transform: "translateX(-50%)",
        zIndex: 3000,
        width: "min(560px, calc(100vw - 24px))",
        padding: "14px 16px",
        borderRadius: "12px",
        background: "#0d2c4d",
        color: "#ffffff",
        boxShadow: "0 12px 32px rgba(0,0,0,.22)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px"
      }}
    >
      <div>
        <div style={{ fontWeight: 700, marginBottom: "4px" }}>
          {forceUpdate ? "Atualização necessária" : "Nova versão do OSFlow disponível"}
        </div>
        <div style={{ fontSize: "13px", opacity: 0.9 }}>
          {forceUpdate
            ? "Atualize para continuar a utilizar o OSFlow."
            : "A aplicação foi atualizada. Pode aplicar a nova versão agora."}
        </div>
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
  );
}
