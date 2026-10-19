import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "../theme/ThemeContext";
import Sidebar from "./Sidebar";

function renderSidebar(initialActiveView = "estoque_np", permissions = { "inventory.view": true, "empreendimentos.view": true }) {
  return render(
    <ThemeProvider>
      <Sidebar
        initialActiveView={initialActiveView}
        setView={jest.fn()}
        logout={jest.fn()}
        collapsed={false}
        onToggle={jest.fn()}
        perfil={{ permissoes: permissions }}
      />
    </ThemeProvider>
  );
}

describe("Sidebar - carteira imobiliária", () => {
  it("apresenta Não Publicitados e Empreendimentos como itens independentes", () => {
    renderSidebar();

    expect(screen.getByRole("button", { name: "Não Publicitados" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Empreendimentos" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Não Publicitados .*▾/ })).not.toBeInTheDocument();
  });

  it("mostra apenas Não Publicitados quando existe apenas inventory.view", () => {
    renderSidebar("estoque_np", { "inventory.view": true });

    expect(screen.getByRole("button", { name: "Não Publicitados" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Empreendimentos" })).not.toBeInTheDocument();
  });

  it("mostra apenas Empreendimentos quando existe apenas empreendimentos.view", () => {
    renderSidebar("estoque_np_empreendimentos", { "empreendimentos.view": true });

    expect(screen.queryByRole("button", { name: "Não Publicitados" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Empreendimentos" })).toBeInTheDocument();
  });

  it("navega cada item para a vista correspondente e acompanha a vista ativa", () => {
    const setView = jest.fn();
    const { rerender } = render(
      <ThemeProvider>
        <Sidebar
          initialActiveView="estoque_np"
          setView={setView}
          logout={jest.fn()}
          collapsed={false}
          onToggle={jest.fn()}
          perfil={{ permissoes: { "inventory.view": true, "empreendimentos.view": true } }}
        />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Não Publicitados" }));
    fireEvent.click(screen.getByRole("button", { name: "Empreendimentos" }));

    expect(setView).toHaveBeenNthCalledWith(1, "estoque_np");
    expect(setView).toHaveBeenNthCalledWith(2, "estoque_np_empreendimentos");

    rerender(
      <ThemeProvider>
        <Sidebar
          initialActiveView="estoque_np_empreendimentos"
          setView={setView}
          logout={jest.fn()}
          collapsed={false}
          onToggle={jest.fn()}
          perfil={{ permissoes: { "inventory.view": true, "empreendimentos.view": true } }}
        />
      </ThemeProvider>
    );

    expect(screen.getByRole("button", { name: "Empreendimentos" })).toHaveStyle({ background: "#0E4D64" });
    expect(screen.getByRole("button", { name: "Não Publicitados" })).not.toHaveStyle({ background: "#0E4D64" });
  });
});
