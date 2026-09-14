import { useCallback, useEffect, useState } from "react";
import { useAuthContext } from "../../auth/context";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { askConfirmation, notifyError, notifySuccess } from "../../../components/ui/feedbackBus";
import { auditMutation } from "../../audit/services/auditService";
import {
  buildDefaultUnidadeForm,
  deletePlantaUnidadeService,
  excluirUnidadeService,
  fetchUnidadesService,
  inferNextFracao,
  mapUnidadeParaFormulario,
  salvarUnidadeService,
  uploadPlantaUnidadeService,
  validarEmpreendimentoTenant,
  validarFracaoDuplicada,
  validarUnidade
} from "../services/unidadesService";

export function useUnidades({ empreendimentoId = null } = {}) {
  const { user } = useAuthContext();
  const { can } = usePermissions();

  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(buildDefaultUnidadeForm());
  const [unidadeEdicao, setUnidadeEdicao] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progresso, setProgresso] = useState(0);

  const podeVer = can("estoque_nao_publicitado.view");
  const podeCriar = can("estoque_nao_publicitado.create_unit");
  const podeEditar = can("estoque_nao_publicitado.edit_unit");
  const podeEliminar = can("estoque_nao_publicitado.delete_unit");
  const podeDuplicar = podeCriar && podeEditar;

  const carregarUnidades = useCallback(async () => {
    if (!empreendimentoId || !podeVer) {
      setUnidades([]);
      return;
    }

    setLoading(true);
    setError("");

    const response = await fetchUnidadesService(empreendimentoId, user);
    setUnidades(response?.data || []);
    setLoading(false);
  }, [empreendimentoId, podeVer, user]);

  useEffect(() => {
    carregarUnidades();
  }, [carregarUnidades]);

  function setField(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function resetFormulario() {
    setUnidadeEdicao(null);
    setForm(buildDefaultUnidadeForm());
    setError("");
    setFile(null);
  }

  function abrirNovaUnidade() {
    if (!podeCriar) {
      notifyError("Sem permissão para criar unidades.");
      return;
    }

    setUnidadeEdicao(null);
    setForm(buildDefaultUnidadeForm());
    setError("");
    setFile(null);
  }

  function iniciarEdicaoUnidade(unidade) {
    if (!podeEditar) {
      notifyError("Sem permissão para editar unidades.");
      return;
    }

    setUnidadeEdicao(unidade);
    setForm(mapUnidadeParaFormulario(unidade));
    setError("");
  }

  function duplicarUnidade(unidade) {
    if (!podeDuplicar) {
      notifyError("Sem permissão para duplicar unidades.");
      return null;
    }

    const novaUnidade = {
      ...mapUnidadeParaFormulario(unidade),
      fracao: inferNextFracao(unidade?.fracao || "") || "",
      id: null,
      empreendimento_id: empreendimentoId,
      empresa_id: unidade?.empresa_id || null,
      created_by: null,
      updated_by: null,
      created_at: null,
      updated_at: null,
      planta: null
    };

    setUnidadeEdicao(null);
    setForm(novaUnidade);
    setError("");
    return novaUnidade;
  }

  async function guardarUnidade() {
    if (!empreendimentoId) {
      setError("Selecione um empreendimento válido antes de guardar a unidade.");
      return null;
    }

    if (!unidadeEdicao && !podeCriar) {
      notifyError("Sem permissão para criar unidades.");
      return null;
    }

    if (unidadeEdicao && !podeEditar) {
      notifyError("Sem permissão para editar unidades.");
      return null;
    }

    const validationError = validarUnidade(form);
    if (validationError) {
      setError(validationError);
      return null;
    }

    const duplicateError = validarFracaoDuplicada({
      fracao: form.fracao,
      empreendimentoId,
      unidades,
      unidadeId: unidadeEdicao?.id || null
    });

    if (duplicateError) {
      setError(duplicateError);
      notifyError(duplicateError);
      return null;
    }

    setSaving(true);
    setError("");

    try {
      const response = await auditMutation(
        unidadeEdicao ? "update" : "create",
        async () => {
          const result = await salvarUnidadeService({
            form: { ...form, empreendimento_id: empreendimentoId },
            empreendimentoId,
            isEditing: Boolean(unidadeEdicao),
            unidadeEdicao,
            currentUser: user
          });

          if (result?.error) {
            throw result.error;
          }

          return result.data?.[0] || result.data || null;
        },
        {
          userId: user?.id || user?.perfil_id || null,
          empresaId: user?.empresa_id || null,
          modulo: "estoque_nao_publicitado",
          entidade: "unidades",
          entidadeId: unidadeEdicao?.id || null,
          metadata: {
            action: unidadeEdicao ? "Unidade atualizada" : "Unidade criada",
            empreendimento_id: empreendimentoId,
            fracao: form.fracao,
            tipologia: form.tipologia
          }
        }
      );

      if (file && response?.id) {
        try {
          await uploadPlanta(response.id);
        } catch (uploadError) {
          notifyError(uploadError?.message || "A unidade foi guardada, mas houve um erro ao carregar a planta.");
        }
      }

      notifySuccess(unidadeEdicao ? "Unidade atualizada com sucesso." : "Unidade criada com sucesso.");
      setSaving(false);
      resetFormulario();
      await carregarUnidades();
      return response;
    } catch (err) {
      setSaving(false);
      const message = err?.message || "Não foi possível guardar a unidade.";
      setError(message);
      notifyError(message);
      return null;
    }
  }

  async function excluirUnidade(unidade) {
    if (!podeEliminar) {
      notifyError("Sem permissão para eliminar unidades.");
      return;
    }

    const confirmado = await askConfirmation({
      title: "Eliminar unidade",
      message: `Deseja eliminar a unidade ${unidade?.fracao || "selecionada"}?`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar"
    });

    if (!confirmado) return;

    try {
      const response = await auditMutation(
        "delete",
        async () => {
          const result = await excluirUnidadeService({ unidadeId: unidade.id, currentUser: user });
          if (result?.error) {
            throw result.error;
          }

          return result.data;
        },
        {
          userId: user?.id || user?.perfil_id || null,
          empresaId: user?.empresa_id || null,
          modulo: "estoque_nao_publicitado",
          entidade: "unidades",
          entidadeId: unidade.id,
          metadata: {
            action: "Unidade eliminada",
            empreendimento_id: empreendimentoId,
            fracao: unidade.fracao,
            planta: []
          }
        }
      );

      if (response) {
        notifySuccess("Unidade eliminada com sucesso.");
        await carregarUnidades();
      }
    } catch (err) {
      notifyError(err?.message || "Não foi possível eliminar a unidade.");
    }
  }

  async function uploadPlanta(unidadeId = unidadeEdicao?.id || null) {
    if (!file || !unidadeId) {
      return null;
    }

    setUploading(true);
    setProgresso(10);

    try {
      const response = await auditMutation(
        "create",
        async () => {
          const { insertError } = await uploadPlantaUnidadeService({
            file,
            unidadeId,
            setProgresso,
            currentUser: user
          });

          if (insertError) {
            throw insertError;
          }

          return true;
        },
        {
          userId: user?.id || user?.perfil_id || null,
          empresaId: user?.empresa_id || null,
          modulo: "estoque_nao_publicitado",
          entidade: "unidades",
          entidadeId: unidadeId,
          metadata: {
            action: "Upload de planta",
            unidade_id: unidadeId,
            empreendimento_id: empreendimentoId,
            ficheiro_nome: file?.name || null,
            tipo_documento: "planta"
          }
        }
      );

      setProgresso(100);
      setFile(null);
      notifySuccess(response ? "Planta carregada com sucesso." : "Planta carregada.");
      await carregarUnidades();
      return true;
    } catch (err) {
      notifyError(err?.message || "Não foi possível carregar a planta.");
      return false;
    } finally {
      setUploading(false);
      setTimeout(() => setProgresso(0), 500);
    }
  }

  async function deletePlanta(ficheiro) {
    if (!ficheiro?.id) {
      return;
    }

    const confirmado = await askConfirmation({
      title: "Eliminar planta",
      message: "Deseja eliminar esta planta da unidade?",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar"
    });

    if (!confirmado) return;

    try {
      const response = await auditMutation(
        "delete",
        async () => {
          const result = await deletePlantaUnidadeService({ ficheiro, currentUser: user });
          if (result?.error) {
            throw result.error;
          }

          return result.data;
        },
        {
          userId: user?.id || user?.perfil_id || null,
          empresaId: user?.empresa_id || null,
          modulo: "estoque_nao_publicitado",
          entidade: "unidades",
          entidadeId: ficheiro?.entidade_id || null,
          metadata: {
            action: "Eliminação de planta",
            unidade_id: ficheiro?.entidade_id || null,
            empreendimento_id: empreendimentoId,
            ficheiro_id: ficheiro?.id || null,
            tipo_documento: "planta"
          }
        }
      );

      if (response) {
        notifySuccess("Planta eliminada.");
        await carregarUnidades();
      }
    } catch (err) {
      notifyError(err?.message || "Não foi possível eliminar a planta.");
    }
  }

  return {
    unidades,
    loading,
    saving,
    error,
    form,
    setField,
    unidadeEdicao,
    resetFormulario,
    abrirNovaUnidade,
    iniciarEdicaoUnidade,
    duplicarUnidade,
    guardarUnidade,
    excluirUnidade,
    podeVer,
    podeCriar,
    podeEditar,
    podeEliminar,
    podeDuplicar,
    file,
    setFile,
    uploading,
    progresso,
    uploadPlanta,
    deletePlanta,
    carregarUnidades
  };
}
