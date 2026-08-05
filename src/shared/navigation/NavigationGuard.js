import { createContext, forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";
import UnsavedChangesDialog from "./UnsavedChangesDialog";

const NavigationGuardContext = createContext(null);

export const NavigationGuard = forwardRef(function NavigationGuard({ children }, ref) {
  const activeGuardRef = useRef(null);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [saving, setSaving] = useState(false);

  const registerGuard = useCallback((guard) => {
    activeGuardRef.current = guard;

    return () => {
      if (activeGuardRef.current === guard) {
        activeGuardRef.current = null;
      }
    };
  }, []);

  const requestNavigation = useCallback((navigate, origin = "desconhecida") => {
    const activeGuard = activeGuardRef.current;
    const isEditing = Boolean(activeGuard?.isEditing?.());
    const isDirty = Boolean(activeGuard?.isDirty?.());

    console.group("NavigationGuard");
    console.log("isEditing", isEditing);
    console.log("isDirty", isDirty);
    console.log("pendingNavigation", Boolean(pendingNavigation));
    console.log("origem da navegação", origin);

    if (!isEditing) {
      console.log("decisão", "navegação direta");
      console.groupEnd();
      navigate?.();
      return;
    }

    console.log("decisão", "mostrar diálogo");
    console.groupEnd();
    setPendingNavigation({ navigate, guard: activeGuard, origin, isDirty });
  }, [pendingNavigation]);

  useImperativeHandle(ref, () => ({ requestNavigation }), [requestNavigation]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    function handleBeforeUnload(event) {
      if (!activeGuardRef.current?.isEditing?.()) return;

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const continuarNavegacao = useCallback(() => {
    const pending = pendingNavigation;
    setPendingNavigation(null);
    pending?.navigate?.();
  }, [pendingNavigation]);

  const handleSave = useCallback(async () => {
    if (!pendingNavigation?.guard?.onSave) return;

    console.group("NavigationGuard");
    console.log("isEditing", pendingNavigation.guard.isEditing?.());
    console.log("isDirty", pendingNavigation.guard.isDirty?.());
    console.log("pendingNavigation", true);
    console.log("origem da navegação", pendingNavigation.origin);
    console.log("decisão", "guardar");
    console.groupEnd();

    setSaving(true);
    const result = await pendingNavigation.guard.onSave();
    setSaving(false);

    if (result?.error) return;

    pendingNavigation.guard.markClean?.();
    continuarNavegacao();
  }, [continuarNavegacao, pendingNavigation]);

  const handleDiscard = useCallback(() => {
    console.group("NavigationGuard");
    console.log("isEditing", pendingNavigation?.guard?.isEditing?.());
    console.log("isDirty", pendingNavigation?.guard?.isDirty?.());
    console.log("pendingNavigation", Boolean(pendingNavigation));
    console.log("origem da navegação", pendingNavigation?.origin || "desconhecida");
    console.log("decisão", "descartar");
    console.groupEnd();

    pendingNavigation?.guard?.onDiscard?.();
    pendingNavigation?.guard?.markClean?.();
    continuarNavegacao();
  }, [continuarNavegacao, pendingNavigation]);

  const handleCancelEditing = useCallback(() => {
    console.group("NavigationGuard");
    console.log("isEditing", pendingNavigation?.guard?.isEditing?.());
    console.log("isDirty", false);
    console.log("pendingNavigation", Boolean(pendingNavigation));
    console.log("origem da navegação", pendingNavigation?.origin || "desconhecida");
    console.log("decisão", "cancelar edição");
    console.groupEnd();

    pendingNavigation?.guard?.onCancelEditing?.();
    continuarNavegacao();
  }, [continuarNavegacao, pendingNavigation]);

  return (
    <NavigationGuardContext.Provider value={{ registerGuard, requestNavigation }}>
      {children}
      <UnsavedChangesDialog
        open={Boolean(pendingNavigation)}
        saving={saving}
        hasUnsavedChanges={Boolean(pendingNavigation?.isDirty)}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onCancelEditing={handleCancelEditing}
        onContinueEditing={() => {
          console.group("NavigationGuard");
          console.log("isEditing", pendingNavigation?.guard?.isEditing?.());
          console.log("isDirty", pendingNavigation?.guard?.isDirty?.());
          console.log("pendingNavigation", Boolean(pendingNavigation));
          console.log("origem da navegação", pendingNavigation?.origin || "desconhecida");
          console.log("decisão", "continuar a editar");
          console.groupEnd();
          setPendingNavigation(null);
        }}
      />
    </NavigationGuardContext.Provider>
  );
});

export function useNavigationGuard({
  isDirty,
  isDirtyNow,
  isEditing = false,
  isEditingNow,
  onSave,
  onDiscard,
  onCancelEditing,
  markClean
}) {
  const context = useContext(NavigationGuardContext);

  useEffect(() => {
    if (!context) return undefined;

    return context.registerGuard({
      isDirty: isDirtyNow || (() => isDirty),
      isEditing: isEditingNow || (() => isEditing),
      onSave,
      onDiscard,
      onCancelEditing,
      markClean
    });
  }, [context, isDirty, isDirtyNow, isEditing, isEditingNow, markClean, onCancelEditing, onDiscard, onSave]);

  return context?.requestNavigation || ((navigate) => navigate?.());
}
