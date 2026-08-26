const SERVICE_WORKER_URL = "/service-worker.js";

export async function registerServiceWorker(onUpdate) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: "/",
      updateViaCache: "none"
    });

    const handleUpdate = (worker) => {
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          onUpdate?.(registration);
        }
      });
    };

    if (registration.waiting) {
      onUpdate?.(registration);
    }

    registration.addEventListener("updatefound", () => {
      handleUpdate(registration.installing);
    });

    await registration.update();

    return registration;
  } catch (error) {
    console.error("[OSFlow PWA] Service Worker registration failed", error);
    return null;
  }
}
