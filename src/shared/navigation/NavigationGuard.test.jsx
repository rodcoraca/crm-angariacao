import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { ThemeProvider } from "../../theme/ThemeContext";
import { NavigationGuard, useNavigationGuard } from "./NavigationGuard";
import { useDirtyForm } from "./useDirtyForm";

function GuardedForm({ onNavigate, onSave = async () => ({ error: null }), initialEditing = false }) {
  const { isDirty, isDirtyNow, markDirty, markClean, reset } = useDirtyForm();
  const [isEditing, setIsEditing] = useState(initialEditing);
  const requestNavigation = useNavigationGuard({
    isDirty,
    isDirtyNow,
    isEditing,
    onSave: async () => {
      const result = await onSave();
      if (!result?.error) {
        markClean();
        setIsEditing(false);
      }
      return result;
    },
    onDiscard: () => {
      reset();
      setIsEditing(false);
    },
    onCancelEditing: () => setIsEditing(false),
    markClean
  });

  return (
    <>
      <button onClick={markDirty}>Alterar</button>
      <button onClick={() => requestNavigation(onNavigate)}>Navegar</button>
    </>
  );
}

function renderGuardedForm(props) {
  return render(
    <ThemeProvider>
      <NavigationGuard>
        <GuardedForm {...props} />
      </NavigationGuard>
    </ThemeProvider>
  );
}

describe("NavigationGuard", () => {
  it("navega diretamente quando não existem alterações", () => {
    const onNavigate = jest.fn();
    renderGuardedForm({ onNavigate });

    fireEvent.click(screen.getByText("Navegar"));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Alterações não guardadas")).toBeNull();
  });

  it("pede o cancelamento da edição mesmo sem alterações", () => {
    const onNavigate = jest.fn();
    renderGuardedForm({ onNavigate, initialEditing: true });

    fireEvent.click(screen.getByText("Navegar"));

    expect(screen.getByText("Existe uma Lead em edição.")).not.toBeNull();
    expect(screen.getByText("Cancelar edição")).not.toBeNull();
    expect(screen.queryByText("Guardar")).toBeNull();
    expect(onNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Cancelar edição"));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("mantém o formulário ao continuar a editar", () => {
    const onNavigate = jest.fn();
    renderGuardedForm({ onNavigate, initialEditing: true });

    fireEvent.click(screen.getByText("Alterar"));
    fireEvent.click(screen.getByText("Navegar"));
    fireEvent.click(screen.getByText("Continuar a editar"));

    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.queryByText("Alterações não guardadas")).toBeNull();
  });

  it("descarta as alterações antes de navegar", () => {
    const onNavigate = jest.fn();
    renderGuardedForm({ onNavigate, initialEditing: true });

    fireEvent.click(screen.getByText("Alterar"));
    fireEvent.click(screen.getByText("Navegar"));
    fireEvent.click(screen.getByText("Descartar"));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("guarda as alterações antes de navegar", async () => {
    const onNavigate = jest.fn();
    const onSave = jest.fn(async () => ({ error: null }));
    renderGuardedForm({ onNavigate, onSave, initialEditing: true });

    fireEvent.click(screen.getByText("Alterar"));
    fireEvent.click(screen.getByText("Navegar"));
    fireEvent.click(screen.getByText("Guardar"));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
