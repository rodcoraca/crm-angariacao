import { useEffect, useState } from "react";
import { useTheme } from "../../theme/ThemeContext";
import Button from "./Button";
import Modal from "./Modal";
import Toast from "./Toast";
import { feedbackEvents } from "./feedbackBus";

export default function FeedbackHost() {
  const theme = useTheme();
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    function onToast(event) {
      const detail = event?.detail || {};
      const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const next = {
        id,
        message: detail.message,
        variant: detail.variant || "neutral"
      };

      setToasts((prev) => [...prev, next]);

      const timeout = Number(detail.duration) > 0 ? Number(detail.duration) : 3200;
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, timeout);
    }

    function onConfirm(event) {
      const detail = event?.detail || {};
      setConfirmState({
        title: detail.title,
        message: detail.message,
        confirmLabel: detail.confirmLabel,
        cancelLabel: detail.cancelLabel,
        resolve: detail.resolve
      });
    }

    window.addEventListener(feedbackEvents.toast, onToast);
    window.addEventListener(feedbackEvents.confirm, onConfirm);

    return () => {
      window.removeEventListener(feedbackEvents.toast, onToast);
      window.removeEventListener(feedbackEvents.confirm, onConfirm);
    };
  }, []);

  function closeConfirm(accepted) {
    if (confirmState?.resolve) {
      confirmState.resolve(Boolean(accepted));
    }
    setConfirmState(null);
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: theme.spacing.md,
          right: theme.spacing.md,
          display: "grid",
          gap: theme.spacing.xs,
          zIndex: 1200,
          width: "min(420px, calc(100vw - 24px))"
        }}
      >
        {toasts.map((toast) => {
          return (
            <Toast
              key={toast.id}
              message={toast.message}
              variant={toast.variant}
              onClose={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
            />
          );
        })}
      </div>

      <Modal
        open={Boolean(confirmState)}
        onClose={() => closeConfirm(false)}
        title={confirmState?.title || "Confirmar ação"}
        size="sm"
        footer={(
          <div style={{ display: "flex", justifyContent: "flex-end", gap: theme.spacing.sm }}>
            <Button variant="ghost" onClick={() => closeConfirm(false)}>
              {confirmState?.cancelLabel || "Cancelar"}
            </Button>
            <Button variant="danger" onClick={() => closeConfirm(true)}>
              {confirmState?.confirmLabel || "Confirmar"}
            </Button>
          </div>
        )}
      >
        <p style={{ margin: 0, color: theme.colors.muted, fontSize: theme.typography.body.fontSize, lineHeight: theme.typography.body.lineHeight }}>
          {confirmState?.message || "Deseja continuar?"}
        </p>
      </Modal>
    </>
  );
}
