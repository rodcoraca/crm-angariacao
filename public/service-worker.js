/* OSFlow PWA service worker.
 *
 * Deliberately does not cache index.html or application/API responses.
 * The application version check + HTTP revalidation keep installed shortcuts
 * on the current release without requiring the user to reinstall the PWA.
 */
const CACHE_NAME = "osflow-runtime-v1";

self.addEventListener("install", () => {
  // Take control immediately only on the first installation. For subsequent
  // releases, keep the new worker waiting until the user chooses to update.
  if (!self.registration.active) {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key.startsWith("osflow-"))
            .map((key) => caches.delete(key))
        )
      )
    ])
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
