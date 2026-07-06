import { useEffect, useState } from "react";
import {
  apagarDocumentoService,
  carregarDocumentosService,
  uploadDocumentoService
} from "../services";
import { mapDocumentosParaLista } from "../viewmodels";
import { askConfirmation, notifyError, notifySuccess } from "../../../components/ui/feedbackBus";

export function useDocumentos() {
  const [documentos, setDocumentos] = useState([]);
  const [file, setFile] = useState(null);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [documentoSelecionado, setDocumentoSelecionado] = useState(null);

  useEffect(() => {
    carregarDocumentos();
  }, []);

  async function carregarDocumentos() {
    const { data } = await carregarDocumentosService();
    setDocumentos(mapDocumentosParaLista(data));
  }

  async function uploadDocumento() {
    const { error } = await uploadDocumentoService({
      nome,
      categoria,
      descricao,
      file
    });

    if (error) {
      notifyError(error.message);
      return;
    }

    notifySuccess("Documento enviado com sucesso.");
    setNome("");
    setCategoria("");
    setDescricao("");
    setFile(null);
    carregarDocumentos();
  }

  async function apagarDocumento(doc) {
    const confirmed = await askConfirmation({
      title: "Apagar documento",
      message: "Deseja apagar este documento?",
      confirmLabel: "Apagar",
      cancelLabel: "Cancelar"
    });

    if (!confirmed) {
      return;
    }

    await apagarDocumentoService(doc.id);
    carregarDocumentos();
  }

  return {
    documentos,
    file,
    nome,
    categoria,
    descricao,
    documentoSelecionado,
    setFile,
    setNome,
    setCategoria,
    setDescricao,
    setDocumentoSelecionado,
    uploadDocumento,
    apagarDocumento
  };
}
