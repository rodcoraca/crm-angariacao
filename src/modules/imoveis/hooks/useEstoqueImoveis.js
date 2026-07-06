import { useEffect, useMemo, useState } from "react";
import {
  apagarFicheiroService,
  buildDefaultFormulario,
  calcularValorM2,
  carregarFicheirosService,
  carregarImoveisService,
  downloadFicheiroService,
  mapImovelParaFormulario,
  salvarImovelService,
  uploadFicheiroService,
  validarTelefoneFormulario
} from "../services";
import { filtrarImoveisPorProprietario } from "../viewmodels";
import { TELEFONE_ERROR_MESSAGE } from "../utils";
import { askConfirmation, notifyError, notifySuccess } from "../../../components/ui/feedbackBus";

export function useEstoqueImoveis() {
  const [imoveis, setImoveis] = useState([]);
  const [busca, setBusca] = useState("");
  const [moduloAtual, setModuloAtual] = useState("lista");
  const [form, setForm] = useState(buildDefaultFormulario());

  const [imovelSelecionado, setImovelSelecionado] = useState(null);
  const [file, setFile] = useState(null);
  const [ficheiros, setFicheiros] = useState([]);
  const [ficheiroSelecionado, setFicheiroSelecionado] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [imovelEdicao, setImovelEdicao] = useState(null);

  const isEditing = Boolean(imovelEdicao);

  useEffect(() => {
    carregarImoveis();
  }, []);

  useEffect(() => {
    const valorCalculado = calcularValorM2(form.valorVenda, form.areaBrutaPrivativa);
    if (valorCalculado) {
      setForm((prev) => ({ ...prev, valorM2: valorCalculado }));
    }
  }, [form.valorVenda, form.areaBrutaPrivativa]);

  const filtrados = useMemo(
    () => filtrarImoveisPorProprietario(imoveis, busca),
    [imoveis, busca]
  );

  async function carregarImoveis() {
    const { data, error } = await carregarImoveisService();

    if (error) {
      console.log(error);
      return;
    }

    console.log("DATA:", data);
    setImoveis(data || []);
  }

  async function carregarFicheiros(imovelId) {
    console.log("IMOVEL ID:", imovelId);

    const { data, error } = await carregarFicheirosService(imovelId);

    console.log("FICHEIROS:", data);
    console.log("ERRO:", error);

    setFicheiros(data || []);
  }

  function setField(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function carregarImovelParaEdicao(imovel) {
    setImovelEdicao(imovel);
    setForm((prev) => ({ ...prev, ...mapImovelParaFormulario(imovel) }));
  }

  function resetFormulario() {
    setImovelEdicao(null);
    setForm(buildDefaultFormulario());
  }

  function cancelarNovo() {
    setModuloAtual("lista");
    resetFormulario();
  }

  function handleTelefoneChange(valor) {
    const { telefone, erro } = validarTelefoneFormulario(valor);
    setForm((prev) => ({ ...prev, telefone, telefoneErro: erro }));
  }

  async function salvarImovel() {
    const { telefone, erro } = validarTelefoneFormulario(form.telefone);

    if (!telefone || erro) {
      setForm((prev) => ({ ...prev, telefone, telefoneErro: `${TELEFONE_ERROR_MESSAGE}\n` }));
      notifyError(TELEFONE_ERROR_MESSAGE);
      return;
    }

    const { error } = await salvarImovelService({
      form: { ...form, telefone },
      isEditing,
      imovelEdicao
    });

    if (error) {
      notifyError(error.message);
      return;
    }

    notifySuccess(isEditing ? "Imóvel atualizado com sucesso." : "Imóvel guardado com sucesso.");

    resetFormulario();
    setModuloAtual("lista");
    setImovelSelecionado(null);
    carregarImoveis();
  }

  async function apagarFicheiro(ficheiro) {
    const confirmed = await askConfirmation({
      title: "Apagar ficheiro",
      message: "Deseja apagar este ficheiro?",
      confirmLabel: "Apagar",
      cancelLabel: "Cancelar"
    });

    if (!confirmed) {
      return;
    }

    const { error } = await apagarFicheiroService(ficheiro.id);

    if (error) {
      notifyError(error.message);
      return;
    }

    if (imovelSelecionado?.id) {
      carregarFicheiros(imovelSelecionado.id);
    }
  }

  async function uploadFicheiro(imovelId) {
    if (!file) return;

    setUploading(true);
    setProgresso(10);

    try {
      const { insertData, insertError } = await uploadFicheiroService({
        file,
        imovelId,
        setProgresso
      });

      console.log("INSERT DATA:", insertData);
      console.log("INSERT ERROR:", insertError);

      if (insertError) {
        throw insertError;
      }

      setProgresso(100);
      carregarFicheiros(imovelId);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgresso(0);
      }, 500);
    }
  }

  async function downloadFicheiro(ficheiro) {
    return downloadFicheiroService(ficheiro);
  }

  function selecionarImovel(imovel) {
    setImovelSelecionado(imovel);
    carregarFicheiros(imovel.id);
  }

  function abrirNovoCadastro() {
    resetFormulario();
    setModuloAtual("cadastro");
  }

  function voltarParaLista() {
    setModuloAtual("lista");
  }

  function iniciarEdicaoSelecionado() {
    if (!imovelSelecionado) return;
    carregarImovelParaEdicao(imovelSelecionado);
    setModuloAtual("cadastro");
  }

  return {
    busca,
    moduloAtual,
    form,
    imovelSelecionado,
    file,
    ficheiros,
    ficheiroSelecionado,
    uploading,
    progresso,
    isEditing,
    filtrados,
    setBusca,
    setModuloAtual,
    setField,
    setFile,
    setFicheiroSelecionado,
    setImovelSelecionado,
    abrirNovoCadastro,
    voltarParaLista,
    iniciarEdicaoSelecionado,
    cancelarNovo,
    handleTelefoneChange,
    salvarImovel,
    apagarFicheiro,
    uploadFicheiro,
    downloadFicheiro,
    selecionarImovel
  };
}
