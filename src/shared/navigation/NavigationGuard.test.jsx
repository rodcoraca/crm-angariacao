import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "../../theme/ThemeContext";
import { NavigationGuard, useNavigationGuard } from "./NavigationGuard";
import { useDirtyForm } from "./useDirtyForm";

function GuardedForm({ onNavigate, onSave = async () => ({ error: null }) }) {
  const { isDirty, isDirtyNow, markDirty, markClean, reset } = useDirtyForm();
  const requestNavigation = useNavigationGuard({
    isDirty,
    isDirtyNow,
    onSave: async () => {
      const result = await onSave();
      if (!result?.error) markClean();
      return result;
    },
    onDiscard: reset,
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

  it("mantém o formulário ao continuar a editar", () => {
    const onNavigate = jest.fn();
    renderGuardedForm({ onNavigate });

    fireEvent.click(screen.getByText("Alterar"));
    fireEvent.click(screen.getByText("Navegar"));
    fireEvent.click(screen.getByText("Continuar a editar"));

    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.queryByText("Alterações não guardadas")).toBeNull();
  });

  it("descarta as alterações antes de navegar", () => {
    const onNavigate = jest.fn();
    renderGuardedForm({ onNavigate });

    fireEvent.click(screen.getByText("Alterar"));
    fireEvent.click(screen.getByText("Navegar"));
    fireEvent.click(screen.getByText("Descartar"));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("guarda as alterações antes de navegar", async () => {
    const onNavigate = jest.fn();
    const onSave = jest.fn(async () => ({ error: null }));
    renderGuardedForm({ onNavigate, onSave });

    fireEvent.click(screen.getByText("Alterar"));
    fireEvent.click(screen.getByText("Navegar"));
    fireEvent.click(screen.getByText("Guardar"));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
