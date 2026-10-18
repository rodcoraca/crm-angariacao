const TOAST_EVENT = "osflow:ui-toast";
const TOAST_DISMISS_EVENT = "osflow:ui-toast-dismiss";
const CONFIRM_EVENT = "osflow:ui-confirm";
const persistentToasts = new Map();
let lastPersistentToastId = null;
let persistentToastSequence = 0;

function dispatchEvent(name, detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function notify({ message, variant = "neutral", duration = 3200, actionLabel, onAction, persistent = false, persistentId }) {
  if (!message) return;
  const resolvedPersistentId = persistent
    ? persistentId || `persistent_${Date.now()}_${persistentToastSequence++}`
    : undefined;
  const detail = { message, variant, duration, actionLabel, onAction, persistent, persistentId: resolvedPersistentId };
  if (persistent) {
    persistentToasts.set(resolvedPersistentId, detail);
    lastPersistentToastId = resolvedPersistentId;
  }
  dispatchEvent(TOAST_EVENT, detail);
}

export function getLastPersistentToast() {
  return lastPersistentToastId ? persistentToasts.get(lastPersistentToastId) || null : null;
}

export function getPersistentToasts() {
  return Array.from(persistentToasts.values());
}

export function clearPersistentToast(persistentId) {
  const targetId = persistentId || lastPersistentToastId;
  if (!targetId || !persistentToasts.has(targetId)) return;

  persistentToasts.delete(targetId);
  if (lastPersistentToastId === targetId) {
    const remaining = Array.from(persistentToasts.keys());
    lastPersistentToastId = remaining.length ? remaining[remaining.length - 1] : null;
  }
  dispatchEvent(TOAST_DISMISS_EVENT, { persistent: true, persistentId: targetId });
}

export function notifySuccess(message) {
  notify({ message, variant: "success" });
}

export function notifyError(message) {
  notify({ message, variant: "danger", duration: 4200 });
}

export function notifyInfo(message) {
  notify({ message, variant: "neutral" });
}

export function askConfirmation({
  title = "Confirmar ação",
  message = "Deseja continuar?",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar"
}) {
  return new Promise((resolve) => {
    dispatchEvent(CONFIRM_EVENT, {
      title,
      message,
      confirmLabel,
      cancelLabel,
      resolve
    });
  });
}

export const feedbackEvents = {
  toast: TOAST_EVENT,
  toastDismiss: TOAST_DISMISS_EVENT,
  confirm: CONFIRM_EVENT
};
