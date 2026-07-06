const TOAST_EVENT = "osflow:ui-toast";
const CONFIRM_EVENT = "osflow:ui-confirm";

function dispatchEvent(name, detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function notify({ message, variant = "neutral", duration = 3200 }) {
  if (!message) return;
  dispatchEvent(TOAST_EVENT, { message, variant, duration });
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
  confirm: CONFIRM_EVENT
};
