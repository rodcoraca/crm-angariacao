import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../../auth/context";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { askConfirmation, notifyError, notifySuccess } from "../../../components/ui/feedbackBus";
import { auditMutation } from "../../audit/services/auditService";
import {
  buildDefaultCondicoesPagamento,
  fetchCondicoesPagamentoService,
  mapCondicaoPagamentoParaFormulario,
  salvarCondicoesPagamentoService,
  excluirCondicaoPagamentoService,
  validarCondicaoPagamento
} from "../services/condicoesPagamentoService";

export function useEmpreendimentoCondicoesPagamento({ empreendimentoId = null } = {}) {
  const { user } = useAuthContext();
  const { can } = usePermissions();

  const [condicoes, setCondicoes] = useState(buildDefaultCondicoesPagamento());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const podeVer = can("estoque_nao_publicitado.view");
  const podeEditar = can("estoque_nao_publicitado.edit_development");
  const podeCriar = false;
  const podeEliminar = can("estoque_nao_publicitado.edit_development");

  const carregarCondicoes = useCallback(async () => {
    if (!empreendimentoId || !podeVer) {
      setCondicoes(buildDefaultCondicoesPagamento());
      return;
    }

    setLoading(true);
    setError("");

    const response = await fetchCondicoesPagamentoService(empreendimentoId);
    const rows = response?.data || [];
    const mappedRows = rows.length ? rows.map(mapCondicaoPagamentoParaFormulario) : buildDefaultCondicoesPagamento();
    setCondicoes(mappedRows);
    setLoading(false);
  }, [empreendimentoId, podeVer]);

  useEffect(() => {
    carregarCondicoes();
  }, [carregarCondicoes]);

  const totalPercentual = useMemo(() => {
    return condicoes
      .filter((condicao) => condicao.tipo_valor === "percentual")
      .reduce((sum, condicao) => {
        const numericValue = Number(String(condicao.valor || "0").replace(/[%\s€]/g, ""));
        return Number.isFinite(numericValue) ? sum + numericValue : sum;
      }, 0);
  }, [condicoes]);

  function atualizarCondicao(index, campo, valor) {
    setCondicoes((prev) => prev.map((condicao, condicaoIndex) => {
      if (condicaoIndex !== index) return condicao;

      const next = { ...condicao, [campo]: valor };

      if (campo === "negociavel" && valor === false) {
        next.condicao_negociacao = "";
      }

      return next;
    }));
  }

  function adicionarEtapa() {
    if (!podeEditar) {
      notifyError("Sem permissão para alterar condições de pagamento.");
      return;
    }

    setCondicoes((prev) => {
      const rows = [...prev];
      const indexEscritura = rows.findIndex((condicao) => condicao.nome_etapa === "Escritura");
      const customSequence = rows.filter((condicao) => condicao.isCustom).length + 1;
      const novaEtapa = {
        id: null,
        nome_etapa: `Reforço ${customSequence}`,
        ordem: indexEscritura === -1 ? rows.length + 1 : indexEscritura,
        tipo_valor: "percentual",
        valor: "",
        negociavel: false,
        condicao_negociacao: "",
        isCustom: true
      };

      if (indexEscritura === -1) {
        rows.push(novaEtapa);
      } else {
        rows.splice(indexEscritura, 0, novaEtapa);
      }

      return rows.map((item, ordemIndex) => ({ ...item, ordem: ordemIndex + 1 }));
    });
  }

  async function removerEtapa(index) {
    if (!podeEditar && !podeEliminar) {
      notifyError("Sem permissão para eliminar etapas personalizadas.");
      return;
    }

    const condicaoSelecionada = condicoes[index];
    const isBaseStep = ["Entrada", "CPCV", "Escritura"].includes(condicaoSelecionada?.nome_etapa || "");

    if (isBaseStep) {
      notifyError("Esta etapa não pode ser eliminada.");
      return;
    }

    const confirmado = await askConfirmation({
      title: "Eliminar etapa",
      message: `Deseja eliminar a etapa ${condicaoSelecionada?.nome_etapa || "selecionada"}?`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar"
    });

    if (!confirmado) return;

    if (condicaoSelecionada?.id) {
      try {
        const result = await excluirCondicaoPagamentoService({ condicaoId: condicaoSelecionada.id, currentUser: user });
        if (result?.error) {
          throw result.error;
        }

        await auditMutation("delete", async () => result, {
          userId: user?.id || user?.perfil_id || null,
          empresaId: user?.empresa_id || null,
          modulo: "estoque_nao_publicitado",
          entidade: "empreendimento_condicoes_pagamento",
          entidadeId: condicaoSelecionada.id,
          metadata: {
            action: "Condição de pagamento eliminada",
            empreendimento_id: empreendimentoId,
            etapa: condicaoSelecionada.nome_etapa
          }
        });
      } catch (err) {
        notifyError(err?.message || "Não foi possível eliminar a etapa.");
        return;
      }
    }

    setCondicoes((prev) => prev.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, ordem: itemIndex + 1 })));
    notifySuccess("Etapa eliminada com sucesso.");
  }

  async function salvarCondicoes() {
    if (!empreendimentoId) {
      setError("Selecione primeiro um empreendimento válido.");
      return null;
    }

    if (!podeEditar) {
      notifyError("Sem permissão para alterar condições de pagamento.");
      return null;
    }

    for (const condicao of condicoes) {
      const validacao = validarCondicaoPagamento(condicao);
      if (validacao) {
        setError(validacao);
        return null;
      }
    }

    setSaving(true);
    setError("");

    try {
      const hasExistingIds = condicoes.some((condicao) => condicao.id);
      const auditEvent = hasExistingIds ? "update" : "create";
      const response = await auditMutation(
        auditEvent,
        async () => {
          const result = await salvarCondicoesPagamentoService({ empreendimentoId, condicoes, currentUser: user });
          if (result?.error) {
            throw result.error;
          }
          return result.data;
        },
        {
          userId: user?.id || user?.perfil_id || null,
          empresaId: user?.empresa_id || null,
          modulo: "estoque_nao_publicitado",
          entidade: "empreendimento_condicoes_pagamento",
          entidadeId: empreendimentoId,
          metadata: {
            action: hasExistingIds ? "Condições de pagamento atualizadas" : "Condições de pagamento criadas",
            empreendimento_id: empreendimentoId,
            total_etapas: condicoes.length
          }
        }
      );

      setSaving(false);
      notifySuccess("Condições de pagamento guardadas com sucesso.");
      await carregarCondicoes();
      return response;
    } catch (err) {
      setSaving(false);
      const message = err?.message || "Não foi possível guardar as condições de pagamento.";
      setError(message);
      notifyError(message);
      return null;
    }
  }

  return {
    condicoes,
    loading,
    saving,
    error,
    setError,
    podeVer,
    podeEditar,
    podeCriar,
    podeEliminar,
    totalPercentual,
    atualizarCondicao,
    adicionarEtapa,
    removerEtapa,
    salvarCondicoes,
    carregarCondicoes
  };
}
