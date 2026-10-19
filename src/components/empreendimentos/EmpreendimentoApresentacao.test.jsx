import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "../../theme/ThemeContext";
import EmpreendimentoApresentacao from "./EmpreendimentoApresentacao";

function renderApresentacao(props = {}) {
  return render(
    <ThemeProvider>
      <EmpreendimentoApresentacao
        empreendimento={{
          id: "emp-1",
          nome: "Jardins do Norte",
          cliente_id: "cli-1",
          morada: "Rua Central, 10",
          concelho: "Porto",
          distrito: "Porto",
          inicio_obras: "2026-01-10",
          previsao_entrega: "2027-06-30",
          percentual_comissao: 3.5
        }}
        cliente={{ id: "cli-1", nome_designacao: "Construtora Norte" }}
        condicoes={[
          { id: "cond-1", nome_etapa: "Entrada", tipo_valor: "percentual", valor: 20 },
          { id: "cond-2", nome_etapa: "CPCV", tipo_valor: "fixo", valor: 10000 }
        ]}
        unidades={[{ id: "unit-1", fracao: "A", tipologia: "T2", area_bruta_privativa: 85, casas_banho: 2, lugares_garagem: 0, preco_venda: 250000, planta: { nome: "planta-a.pdf", url: "https://example.test/planta-a.pdf" } }]}
        documentos={{ brochura: [{ id: "doc-1", nome: "brochura.pdf", url: "https://example.test/brochura.pdf" }] }}
        categorias={["brochura", "planta"]}
        onBack={props.onBack || jest.fn()}
        {...props}
      />
    </ThemeProvider>
  );
}

describe("EmpreendimentoApresentacao", () => {
  it("apresenta os dados comerciais, frações com preço e a consulta das condições herdadas", () => {
    renderApresentacao();

    expect(screen.getByRole("heading", { name: "Jardins do Norte" })).toBeInTheDocument();
    expect(screen.getByText("Rua Central, 10 · Porto · Porto")).toBeInTheDocument();
    const row = screen.getByRole("row", { name: /A T2/ });
    expect(row).toHaveTextContent("250");
    expect(row).toHaveTextContent("2");
    expect(row).toHaveTextContent("0");
    expect(screen.getByRole("link", { name: "planta-a.pdf" })).toHaveAttribute("href", "https://example.test/planta-a.pdf");
    fireEvent.click(row);

    const panel = screen.getByRole("complementary", { name: /Detalhe da fração A/i });
    expect(panel).toHaveTextContent("Entrada");
    expect(panel).toHaveTextContent("CPCV");
    expect(panel).toHaveTextContent("Casas de banho: 2");
    expect(panel).toHaveTextContent("Lugares de garagem: 0");
    expect(panel).toHaveTextContent("50");
    expect(panel).toHaveTextContent("10");
    expect(within(panel).getAllByRole("table")).toHaveLength(1);
    expect(within(panel).queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /brochura\.pdf/i })).toHaveAttribute("href", "https://example.test/brochura.pdf");
    expect(screen.getByText("Sem documentos nesta categoria.")).toBeInTheDocument();
  });

  it("mostra um estado neutro quando a fração não tem preço", () => {
    renderApresentacao({
      unidades: [{ id: "unit-sem-preco", fracao: "B", tipologia: "T1", area_bruta_privativa: 60 }]
    });

    fireEvent.click(screen.getByRole("row", { name: /B T1/ }));

    const panel = screen.getByRole("complementary", { name: /Detalhe da fração B/i });
    expect(panel).toHaveTextContent("Preço: —");
    expect(panel).toHaveTextContent("Casas de banho: —");
    expect(panel).toHaveTextContent("Lugares de garagem: —");
    expect(panel).toHaveTextContent("Não calculável");
    expect(panel).not.toHaveTextContent("Plano equilibrado");
  });

  it("actualiza o painel e os montantes ao mudar de fração", () => {
    renderApresentacao({
      unidades: [
        { id: "unit-a", fracao: "A", tipologia: "T2", area_bruta_privativa: 85, preco_venda: 250000 },
        { id: "unit-b", fracao: "B", tipologia: "T3", area_bruta_privativa: 100, preco_venda: 300000 }
      ],
      condicoes: [{ id: "cond-percentual", nome_etapa: "Entrada", tipo_valor: "percentual", valor: 20 }]
    });

    fireEvent.click(screen.getByRole("row", { name: /A T2/ }));
    expect(screen.getByRole("complementary", { name: /Detalhe da fração A/i })).toHaveTextContent("50");

    fireEvent.click(screen.getByRole("row", { name: /B T3/ }));
    expect(screen.queryByRole("complementary", { name: /Detalhe da fração A/i })).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /Detalhe da fração B/i })).toHaveTextContent("60");
  });

  it("identifica condições inválidas sem as apresentar como equilibradas", () => {
    renderApresentacao({
      condicoes: [{ id: "cond-invalida", nome_etapa: "Entrada", tipo_valor: "desconhecido", valor: 20 }],
      unidades: [{ id: "unit-invalida", fracao: "C", tipologia: "T2", preco_venda: 250000 }]
    });

    fireEvent.click(screen.getByRole("row", { name: /C T2/ }));

    const panel = screen.getByRole("complementary", { name: /Detalhe da fração C/i });
    expect(panel).toHaveTextContent("Condição inválida");
    expect(panel).toHaveTextContent("Não calculável");
    expect(panel).not.toHaveTextContent("Plano equilibrado");
  });

  it("quebra nomes de ficheiro longos mesmo sem espaços sem perder o link", () => {
    const nomeLongo = `${"documento".repeat(30)}.pdf`;
    renderApresentacao({
      documentos: { brochura: [{ id: "doc-longo", nome: nomeLongo, url: "https://example.test/documento-longo.pdf" }] },
      categorias: ["brochura"]
    });

    const link = screen.getByRole("link", { name: new RegExp(nomeLongo) });
    expect(link).toHaveAttribute("href", "https://example.test/documento-longo.pdf");
    expect(link.style.minWidth).toBe("0");
    expect(link.style.maxWidth).toBe("100%");
    expect(link.style.overflowWrap).toBe("anywhere");
  });

  it("apresenta estados de carregamento e erro", () => {
    const { rerender } = renderApresentacao({ loadingCondicoes: true });
    expect(screen.getByText("A carregar informação…")).toBeInTheDocument();

    rerender(
      <ThemeProvider>
        <EmpreendimentoApresentacao
          empreendimento={{ nome: "Jardins do Norte" }}
          errorUnidades="Não foi possível carregar as unidades."
          categorias={[]}
        />
      </ThemeProvider>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as unidades.");
  });

  it("apresenta ausência de dados e respeita a permissão dos documentos", () => {
    const { rerender } = renderApresentacao({
      condicoes: [],
      unidades: [],
      documentos: {},
      categorias: ["brochura"]
    });

    expect(screen.getByText("Ainda não existem condições de pagamento configuradas.")).toBeInTheDocument();
    expect(screen.getByText("Não existem unidades disponíveis para consulta.")).toBeInTheDocument();
    expect(screen.getByText("Sem documentos nesta categoria.")).toBeInTheDocument();

    rerender(
      <ThemeProvider>
        <EmpreendimentoApresentacao
          empreendimento={{ nome: "Jardins do Norte" }}
          podeConsultarDocumentos={false}
          categorias={["brochura"]}
        />
      </ThemeProvider>
    );

    expect(screen.getByText("Não tem permissão para consultar os documentos deste empreendimento.")).toBeInTheDocument();
  });

  it("mantém uma identificação segura quando o cliente associado não está disponível", () => {
    renderApresentacao({ cliente: null });

    expect(screen.getAllByText(/Cliente não indicado/)).toHaveLength(2);
  });

  it("permite regressar à listagem", () => {
    const onBack = jest.fn();
    renderApresentacao({ onBack });

    fireEvent.click(screen.getByRole("button", { name: /voltar à listagem/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
