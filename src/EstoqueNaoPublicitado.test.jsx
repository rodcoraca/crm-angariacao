import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import EstoqueNaoPublicitado from "./EstoqueNaoPublicitado";

const mockUnidadesSemPlanta = [{ id: "unidade-1", fracao: "A", tipologia: "T2", preco_venda: 0 }];
let mockUnidades = mockUnidadesSemPlanta;

beforeEach(() => {
  mockUnidades = mockUnidadesSemPlanta;
});

jest.mock("./CadastroImovel", () => () => null);
jest.mock("./FichaImovel", () => () => null);

jest.mock("./modules/imoveis", () => ({
  useEstoqueImoveis: () => ({
    busca: "",
    moduloAtual: "lista",
    form: {},
    imovelSelecionado: null,
    file: null,
    ficheiros: [],
    ficheiroSelecionado: null,
    uploading: false,
    progresso: 0,
    isEditing: false,
    filtrados: [],
    setBusca: jest.fn(),
    setModuloAtual: jest.fn(),
    setField: jest.fn(),
    setFile: jest.fn(),
    setFicheiroSelecionado: jest.fn(),
    setImovelSelecionado: jest.fn(),
    abrirNovoCadastro: jest.fn(),
    voltarParaLista: jest.fn(),
    iniciarEdicaoSelecionado: jest.fn(),
    cancelarNovo: jest.fn(),
    handleTelefoneChange: jest.fn(),
    salvarImovel: jest.fn(),
    apagarFicheiro: jest.fn(),
    excluirImovel: jest.fn(),
    uploadFicheiro: jest.fn(),
    downloadFicheiro: jest.fn(),
    selecionarImovel: jest.fn()
  })
}));

jest.mock("./modules/clientes", () => ({
  useClientes: () => ({
    clientes: [{ id: "cliente-1", nome_designacao: "Cliente Teste", tipo_cliente: "Promotor" }],
    empreendimentosPorCliente: { "cliente-1": 1 },
    usuariosEmpresa: [],
    busca: "",
    setBusca: jest.fn(),
    moduloAtual: "lista",
    setModuloAtual: jest.fn(),
    form: {},
    setField: jest.fn(),
    clienteEdicao: null,
    submitting: false,
    loading: false,
    error: "",
    filtrados: [{ id: "cliente-1", nome_designacao: "Cliente Teste", tipo_cliente: "Promotor" }],
    podeVer: true,
    podeCriar: false,
    podeEditar: false,
    podeEliminar: false,
    podeVerDadosPrivados: false,
    currentProfileId: null,
    responsavelAtual: null,
    abrirNovoCliente: jest.fn(),
    voltarParaLista: jest.fn(),
    iniciarEdicaoCliente: jest.fn(),
    salvarCliente: jest.fn(),
    excluirCliente: jest.fn(),
    resetFormulario: jest.fn()
  })
}));

jest.mock("./modules/empreendimentos/hooks/useEmpreendimentos", () => ({
  useEmpreendimentos: () => ({
    empreendimentos: [{ id: "empreendimento-1", cliente_id: "cliente-1", nome: "Empreendimento Teste" }],
    loading: false,
    submitting: false,
    error: "",
    form: {},
    setField: jest.fn(),
    mostrarFormulario: false,
    setMostrarFormulario: jest.fn(),
    empreendimentoEdicao: null,
    podeVer: true,
    podeCriar: false,
    podeEditar: false,
    podeEliminar: false,
    distritoOptions: [],
    concelhoOptions: [],
    freguesiaOptions: [],
    abrirNovoEmpreendimento: jest.fn(),
    iniciarEdicaoEmpreendimento: jest.fn(),
    resetFormulario: jest.fn(),
    salvarEmpreendimento: jest.fn(),
    excluirEmpreendimento: jest.fn(),
    documentosEmpreendimento: {},
    loadingDocumentosEmpreendimento: false,
    documentosError: "",
    documentAction: {},
    carregarDocumentosEmpreendimento: jest.fn(),
    uploadDocumentoEmpreendimento: jest.fn(),
    substituirDocumentoEmpreendimento: jest.fn(),
    eliminarDocumentoEmpreendimento: jest.fn(),
    EMPREENDIMENTO_DOCUMENT_CATEGORIES: []
  })
}));

jest.mock("./modules/empreendimentos/hooks/useEmpreendimentoCondicoesPagamento", () => ({
  useEmpreendimentoCondicoesPagamento: () => ({
    condicoes: [
      { nome_etapa: "Entrada", ordem: 1, tipo_valor: "fixo", valor: 10000 },
      { nome_etapa: "Inválida", ordem: 2, tipo_valor: "desconhecido", valor: 20 }
    ],
    loading: false,
    saving: false,
    error: "",
    podeEditar: false,
    podeCriar: false,
    podeEliminar: false,
    totalPercentual: 0,
    nomesEtapasDuplicados: [],
    atualizarCondicao: jest.fn(),
    adicionarEtapa: jest.fn(),
    removerEtapa: jest.fn(),
    salvarCondicoes: jest.fn()
  })
}));

jest.mock("./modules/empreendimentos/hooks/useUnidades", () => ({
  useUnidades: () => ({
    unidades: mockUnidades,
    loading: false,
    saving: false,
    error: "",
    form: {},
    setField: jest.fn(),
    unidadeEdicao: null,
    resetFormulario: jest.fn(),
    abrirNovaUnidade: jest.fn(),
    iniciarEdicaoUnidade: jest.fn(),
    duplicarUnidade: jest.fn(),
    guardarUnidade: jest.fn(),
    excluirUnidade: jest.fn(),
    podeVer: true,
    podeCriar: false,
    podeEditar: false,
    podeEliminar: false,
    podeDuplicar: false,
    file: null,
    setFile: jest.fn(),
    uploading: false,
    progresso: 0,
    uploadPlanta: jest.fn(),
    deletePlanta: jest.fn()
  })
}));

jest.mock("./components/ui/Button", () => ({ children, ...props }) => <button {...props}>{children}</button>);
jest.mock("./components/ui/Input", () => ({ label, ...props }) => <label>{label}<input {...props} /></label>);
jest.mock("./components/ui/Select", () => ({ label, options = [], ...props }) => <label>{label}<select {...props}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>);
jest.mock("./components/ui/EmptyState", () => ({ title, description }) => <div>{title}{description}</div>);
jest.mock("./components/ui/Tooltip", () => ({ children }) => <>{children}</>);

describe("EstoqueNaoPublicitado - condições herdadas por unidade", () => {
  it("apresenta indicação visual de condição inválida combinada com preço zero", () => {
    render(<EstoqueNaoPublicitado defaultSection="clientes" />);

    fireEvent.click(screen.getByText("Cliente Teste"));
    fireEvent.click(screen.getByText("Empreendimento Teste"));
    fireEvent.click(screen.getByLabelText("Mais ações"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Condições" }));

    expect(screen.getByText(/Existem condições inválidas/)).toBeInTheDocument();
    expect(screen.getAllByText("Incompleto / inválido")).toHaveLength(2);
    expect(screen.getAllByText(/Total parcial/).some((element) => element.textContent.includes("10"))).toBe(true);
  });

  it("apresenta uma única tabela compacta para as condições herdadas da fração", () => {
    render(<EstoqueNaoPublicitado defaultSection="clientes" />);

    fireEvent.click(screen.getByText("Cliente Teste"));
    fireEvent.click(screen.getByText("Empreendimento Teste"));
    expect(screen.getAllByTestId(/condicao-pagamento-/)).toHaveLength(2);
    const unidadeCell = screen.getByTestId("unidade-identidade-unidade-1");
    const unidadeRow = screen.getByRole("row", { name: /A T2/ });
    expect(unidadeCell).toHaveStyle({ borderLeftWidth: "4px", borderLeftStyle: "solid" });
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Mais ações"));
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Duplicar" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Eliminar" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Condições" }));

    expect(unidadeRow).toHaveStyle({ backgroundColor: "rgba(37, 99, 235, 0.06)" });
    expect(screen.getByTestId("unidade-detalhes").textContent).toContain("Tipologia: T2");
    expect(screen.getByText("Etapa")).toBeInTheDocument();
    expect(screen.getByText("Condição")).toBeInTheDocument();
    expect(screen.getByText("Montante")).toBeInTheDocument();
    expect(within(screen.getByRole("complementary")).getAllByRole("row")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Mais ações"));
    expect(screen.getByRole("menuitem", { name: "Fechar condições" })).toBeInTheDocument();
    expect(screen.queryByText("Valor definido")).not.toBeInTheDocument();
    expect(screen.queryByText("Total acumulado")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(unidadeRow.style.backgroundColor).toBe("");
    fireEvent.click(screen.getByLabelText("Mais ações"));
    expect(screen.getByRole("menuitem", { name: "Condições" })).toBeInTheDocument();
    expect(screen.queryByText("Condição configurada")).not.toBeInTheDocument();
  });

  it("disponibiliza a consulta das condições na linha e indica quando não existe planta", () => {
    render(<EstoqueNaoPublicitado defaultSection="clientes" />);

    fireEvent.click(screen.getByText("Cliente Teste"));
    fireEvent.click(screen.getByText("Empreendimento Teste"));

    const row = screen.getByRole("row", { name: /A T2/ });
    expect(screen.getByRole("button", { name: "Condições de pagamento da fração A" })).toBeInTheDocument();
    expect(screen.getByText("Sem planta")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Condições de pagamento da fração A" }));
    expect(screen.getByRole("complementary")).toBeInTheDocument();
    expect(row).toHaveStyle({ backgroundColor: "rgba(37, 99, 235, 0.06)" });
  });

  it("mantém o link da planta associado à fração", () => {
    mockUnidades = [{ ...mockUnidadesSemPlanta[0], planta: { nome: "planta-a.pdf", url: "https://example.test/planta-a.pdf" } }];
    render(<EstoqueNaoPublicitado defaultSection="clientes" />);

    fireEvent.click(screen.getByText("Cliente Teste"));
    fireEvent.click(screen.getByText("Empreendimento Teste"));

    expect(screen.getByRole("link", { name: /Planta: planta-a\.pdf/i })).toHaveAttribute("href", "https://example.test/planta-a.pdf");
  });
});
