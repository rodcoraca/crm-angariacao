import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../../auth/context";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { askConfirmation, notifyError, notifySuccess } from "../../../components/ui/feedbackBus";
import { auditMutation } from "../../audit/services/auditService";
import { DISTRITOS, LOCALIZACAO_PORTUGAL } from "../data/localizacao";
import {
  buildDefaultEmpreendimentoForm,
  fetchEmpreendimentosService,
  mapEmpreendimentoParaFormulario,
  salvarEmpreendimentoService,
  excluirEmpreendimentoService,
  validarEmpreendimento
} from "../services/empreendimentosService";
import {
  deleteEmpreendimentoDocumentoService,
  fetchEmpreendimentoDocumentosService,
  replaceEmpreendimentoDocumentoService,
  uploadEmpreendimentoDocumentoService,
  EMPREENDIMENTO_DOCUMENT_CATEGORIES,
  mapCategoriaEmpreendimentoLabel
} from "../services/empreendimentoDocumentosService";

export function useEmpreendimentos({ clienteId = null } = {}) {
  const { user } = useAuthContext();
  const { can } = usePermissions();

  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [form, setForm] = useState(buildDefaultEmpreendimentoForm(clienteId));
  const [empreendimentoEdicao, setEmpreendimentoEdicao] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [documentosEmpreendimento, setDocumentosEmpreendimento] = useState({});
  const [loadingDocumentosEmpreendimento, setLoadingDocumentosEmpreendimento] = useState(false);
  const [documentosError, setDocumentosError] = useState("");
  const [documentAction, setDocumentAction] = useState({ category: null, action: null });

  const podeVer = can("empreendimentos.view");
  const podeCriar = can("empreendimentos.create");
  const podeEditar = can("empreendimentos.edit");
  const podeEliminar = can("empreendimentos.delete");

  const carregarDados = useCallback(async () => {
    if (!clienteId || !podeVer) {
      setEmpreendimentos([]);
      return;
    }

    setLoading(true);
    setError("");

    const response = await fetchEmpreendimentosService(clienteId);
    setEmpreendimentos(response?.data || []);
    setLoading(false);
  }, [clienteId, podeVer]);

  const carregarDocumentosEmpreendimento = useCallback(async (empreendimentoIdToLoad = null) => {
    const targetEmpreendimentoId = empreendimentoIdToLoad || null;
    if (!targetEmpreendimentoId || !podeVer) {
      setDocumentosEmpreendimento({});
      setLoadingDocumentosEmpreendimento(false);
      return { data: [], error: null };
    }

    setLoadingDocumentosEmpreendimento(true);
    setDocumentosError("");

    try {
      const response = await fetchEmpreendimentoDocumentosService(targetEmpreendimentoId, user);
      if (response?.error) {
        throw response.error;
      }

      const ficheiros = response?.data || [];
      const grouped = {}; 
      EMPREENDIMENTO_DOCUMENT_CATEGORIES.forEach((categoria) => {
        grouped[categoria] = (ficheiros || []).filter((ficheiro) => String(ficheiro?.tipo_documento || "").toLowerCase() === categoria);
      });

      setDocumentosEmpreendimento(grouped);
      setLoadingDocumentosEmpreendimento(false);
      return { data: grouped, error: null };
    } catch (err) {
      setLoadingDocumentosEmpreendimento(false);
      setDocumentosError(err?.message || "Não foi possível carregar os documentos do empreendimento.");
      setDocumentosEmpreendimento({});
      return { data: {}, error: err };
    }
  }, [podeVer, user]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    setForm((previous) => ({
      ...buildDefaultEmpreendimentoForm(clienteId),
      ...previous,
      cliente_id: clienteId || previous.cliente_id || ""
    }));
  }, [clienteId]);

  const distritoOptions = useMemo(() => DISTRITOS, []);

  const concelhoOptions = useMemo(() => {
    if (!form.distrito) return [];
    return Object.keys(LOCALIZACAO_PORTUGAL[form.distrito] || {});
  }, [form.distrito]);

  const freguesiaOptions = useMemo(() => {
    if (!form.distrito || !form.concelho) return [];
    return LOCALIZACAO_PORTUGAL[form.distrito]?.[form.concelho] || [];
  }, [form.distrito, form.concelho]);

  function setField(campo, valor) {
    setForm((prev) => {
      const next = { ...prev, [campo]: valor };

      if (campo === "distrito" && valor !== prev.distrito) {
        next.concelho = "";
        next.freguesia = "";
      }

      if (campo === "concelho" && valor !== prev.concelho) {
        next.freguesia = "";
      }

      return next;
    });
  }

  function resetFormulario() {
    setEmpreendimentoEdicao(null);
    setMostrarFormulario(false);
    setForm(buildDefaultEmpreendimentoForm(clienteId));
    setError("");
  }

  function abrirNovoEmpreendimento() {
    if (!podeCriar) {
      notifyError("Sem permissão para criar empreendimento.");
      return;
    }

    setEmpreendimentoEdicao(null);
    setForm(buildDefaultEmpreendimentoForm(clienteId));
    setMostrarFormulario(true);
    setError("");
  }

  function iniciarEdicaoEmpreendimento(empreendimento) {
    if (!podeEditar) {
      notifyError("Sem permissão para editar empreendimento.");
      return;
    }

    setEmpreendimentoEdicao(empreendimento);
    setForm(mapEmpreendimentoParaFormulario(empreendimento));
    setMostrarFormulario(true);
    setError("");
  }

  async function salvarEmpreendimento() {
    if (!clienteId || !clienteId.trim()) {
      setError("Selecione um cliente válido antes de guardar o empreendimento.");
      return;
    }

    if (!podeCriar && !empreendimentoEdicao) {
      notifyError("Sem permissão para criar empreendimento.");
      return;
    }

    if (empreendimentoEdicao && !podeEditar) {
      notifyError("Sem permissão para editar empreendimento.");
      return;
    }

    const validationError = validarEmpreendimento({ ...form, cliente_id: clienteId });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await auditMutation(
        empreendimentoEdicao ? "update" : "create",
        async () => {
          const result = await salvarEmpreendimentoService({
            form: { ...form, cliente_id: clienteId },
            clienteId,
            isEditing: Boolean(empreendimentoEdicao),
            empreendimentoEdicao,
            currentUser: user
          });

          if (result?.error) {
            throw result.error;
          }

          return result.data?.[0] || result.data || empreendimentoEdicao || null;
        },
        {
          userId: user?.id || user?.perfil_id || null,
          empresaId: user?.empresa_id || null,
          modulo: "estoque_nao_publicitado",
          entidade: "empreendimentos",
          entidadeId: empreendimentoEdicao?.id || null,
          metadata: {
            action: empreendimentoEdicao ? "Empreendimento atualizado" : "Empreendimento criado",
            cliente_id: clienteId,
            nome: form.nome,
            empresa_id: user?.empresa_id || null
          }
        }
      );

      notifySuccess(empreendimentoEdicao ? "Empreendimento atualizado com sucesso." : "Empreendimento criado com sucesso.");
      setSubmitting(false);
      resetFormulario();
      await carregarDados();
      return response;
    } catch (err) {
      setSubmitting(false);
      const message = err?.message || "Não foi possível guardar o empreendimento.";
      setError(message);
      notifyError(message);
      return null;
    }
  }

  async function excluirEmpreendimento(empreendimento) {
    if (!podeEliminar) {
      notifyError("Sem permissão para eliminar empreendimento.");
      return;
    }

    const confirmado = await askConfirmation({
      title: "Eliminar empreendimento",
      message: `Deseja eliminar o empreendimento ${empreendimento?.nome || "selecionado"}?`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar"
    });

    if (!confirmado) {
      return;
    }

    try {
      const response = await auditMutation(
        "delete",
        async () => {
          const result = await excluirEmpreendimentoService({ empreendimentoId: empreendimento.id, currentUser: user });
          if (result?.error) {
            throw result.error;
          }
          return result.data;
        },
        {
          userId: user?.id || user?.perfil_id || null,
          empresaId: user?.empresa_id || null,
          modulo: "estoque_nao_publicitado",
          entidade: "empreendimentos",
          entidadeId: empreendimento.id,
          metadata: {
            action: "Empreendimento eliminado",
            cliente_id: empreendimento.cliente_id,
            nome: empreendimento.nome
          }
        }
      );

      if (response) {
        notifySuccess("Empreendimento eliminado com sucesso.");
        await carregarDados();
      }
    } catch (err) {
      const message = err?.message || "Não foi possível eliminar o empreendimento.";
      notifyError(message);
    }
  }

  async function uploadDocumentoEmpreendimento({ empreendimentoId, categoria, file }) {
    if (!podeEditar) {
      notifyError("Sem permissão para editar documentos do empreendimento.");
      return null;
    }

    if (!empreendimentoId || !categoria || !file) {
      const validationMessage = !file ? "Selecione um ficheiro antes de carregar." : "Dados do documento do empreendimento são inválidos.";
      setDocumentosError(validationMessage);
      notifyError(validationMessage);
      return null;
    }

    setDocumentAction({ category: categoria, action: "upload" });
    setDocumentosError("");

    try {
      const response = await auditMutation(
        "create",
        async () => {
          const result = await uploadEmpreendimentoDocumentoService({ file, empreendimentoId, categoria, currentUser: user });
          if (result?.error) {
            throw result.error;
          }
          return result.data;
        },
        {
          userId: user?.id || user?.perfil_id || null,
          empresaId: user?.empresa_id || null,
          modulo: "estoque_nao_publicitado",
          entidade: "empreendimentos_documentos",
          entidadeId: empreendimentoId,
          metadata: {
            action: "documento_upload",
            empreendimento_id: empreendimentoId,
            nome: form.nome || "Empreendimento",
            ficheiro: file?.name || null,
            tipo_documento: categoria,
            utilizador: user?.email || user?.nome || null
          }
        }
      );

      setDocumentAction({ category: null, action: null });
      notifySuccess(`Documento ${mapCategoriaEmpreendimentoLabel(categoria)} carregado com sucesso.`);
      await carregarDocumentosEmpreendimento(empreendimentoId);
      return response;
    } catch (err) {
      const message = err?.message || "Não foi possível carregar o documento.";
      setDocumentosError(message);
      notifyError(message);
      return null;
    } finally {
      setDocumentAction({ category: null, action: null });
    }
  }

  async function substituirDocumentoEmpreendimento({ empreendimentoId, categoria, ficheiro, file }) {
    if (!podeEditar) {
      notifyError("Sem permissão para substituir documentos do empreendimento.");
      return null;
    }

    if (!empreendimentoId || !ficheiro || !file) {
      const validationMessage = !file ? "Selecione um ficheiro para substituir." : "Documento do empreendimento inválido.";
      setDocumentosError(validationMessage);
      notifyError(validationMessage);
      return null;
    }

    setDocumentAction({ category: categoria || ficheiro.tipo_documento || null, action: "replace" });
    setDocumentosError("");

    try {
      const response = await auditMutation(
        "update",
        async () => {
          const result = await replaceEmpreendimentoDocumentoService({ ficheiro, file, empreendimentoId, categoria, currentUser: user });
          if (result?.error) {
            throw result.error;
          }
          return result.data;
        },
        {
          userId: user?.id || user?.perfil_id || null,
          empresaId: user?.empresa_id || null,
          modulo: "estoque_nao_publicitado",
          entidade: "empreendimentos_documentos",
          entidadeId: empreendimentoId,
          metadata: {
            action: "documento_update",
            empreendimento_id: empreendimentoId,
            nome: form.nome || "Empreendimento",
            ficheiro: file?.name || ficheiro?.nome || null,
            tipo_documento: categoria || ficheiro?.tipo_documento || null,
            utilizador: user?.email || user?.nome || null
          }
        }
      );

      notifySuccess(`Documento ${mapCategoriaEmpreendimentoLabel(categoria || ficheiro?.tipo_documento)} substituído com sucesso.`);
      await carregarDocumentosEmpreendimento(empreendimentoId);
      return response;
    } catch (err) {
      const message = err?.message || "Não foi possível substituir o documento.";
      setDocumentosError(message);
      notifyError(message);
      return null;
    } finally {
      setDocumentAction({ category: null, action: null });
    }
  }

  async function eliminarDocumentoEmpreendimento({ empreendimentoId, ficheiro, categoria }) {
    if (!podeEditar) {
      notifyError("Sem permissão para eliminar documentos do empreendimento.");
      return null;
    }

    if (!empreendimentoId || !ficheiro?.id) {
      notifyError("Não foi possível identificar o documento para eliminar.");
      return null;
    }

    const confirmado = await askConfirmation({
      title: "Eliminar documento",
      message: `Deseja eliminar ${ficheiro?.nome || mapCategoriaEmpreendimentoLabel(categoria || ficheiro?.tipo_documento || "documento")}?`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar"
    });

    if (!confirmado) {
      return null;
    }

    setDocumentAction({ category: categoria || ficheiro.tipo_documento || null, action: "delete" });
    setDocumentosError("");

    try {
      const response = await auditMutation(
        "delete",
        async () => {
          const result = await deleteEmpreendimentoDocumentoService({ ficheiro, currentUser: user });
          if (result?.error) {
            throw result.error;
          }
          return result.data;
        },
        {
          userId: user?.id || user?.perfil_id || null,
          empresaId: user?.empresa_id || null,
          modulo: "estoque_nao_publicitado",
          entidade: "empreendimentos_documentos",
          entidadeId: empreendimentoId,
          metadata: {
            action: "documento_delete",
            empreendimento_id: empreendimentoId,
            nome: form.nome || "Empreendimento",
            ficheiro: ficheiro?.nome || null,
            tipo_documento: categoria || ficheiro?.tipo_documento || null,
            utilizador: user?.email || user?.nome || null
          }
        }
      );

      notifySuccess("Documento eliminado com sucesso.");
      await carregarDocumentosEmpreendimento(empreendimentoId);
      return response;
    } catch (err) {
      const message = err?.message || "Não foi possível eliminar o documento.";
      setDocumentosError(message);
      notifyError(message);
      return null;
    } finally {
      setDocumentAction({ category: null, action: null });
    }
  }

  return {
    empreendimentos,
    loading,
    submitting,
    error,
    setError,
    form,
    setField,
    mostrarFormulario,
    setMostrarFormulario,
    empreendimentoEdicao,
    podeVer,
    podeCriar,
    podeEditar,
    podeEliminar,
    distritoOptions,
    concelhoOptions,
    freguesiaOptions,
    carregarDados,
    abrirNovoEmpreendimento,
    iniciarEdicaoEmpreendimento,
    resetFormulario,
    salvarEmpreendimento,
    excluirEmpreendimento,
    documentosEmpreendimento,
    loadingDocumentosEmpreendimento,
    documentosError,
    documentAction,
    carregarDocumentosEmpreendimento,
    uploadDocumentoEmpreendimento,
    substituirDocumentoEmpreendimento,
    eliminarDocumentoEmpreendimento,
    EMPREENDIMENTO_DOCUMENT_CATEGORIES
  };
}
